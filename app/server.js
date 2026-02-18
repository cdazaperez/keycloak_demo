const express = require("express");
const session = require("express-session");
const { Issuer, generators } = require("openid-client");
const path = require("path");

const app = express();
const PORT = 3100;

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://keycloak:8080";
const KEYCLOAK_EXTERNAL_URL =
  process.env.KEYCLOAK_EXTERNAL_URL || "http://localhost:8080";
const REALM = process.env.KEYCLOAK_REALM || "demo";
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || "demo-app";
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || "demo-app-secret";
const APP_URL = process.env.APP_URL || "http://localhost:3100";

let oidcClient;

app.use(
  session({
    secret: "keycloak-demo-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 30 * 60 * 1000 },
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

async function initializeOidc() {
  const issuerUrl = `${KEYCLOAK_URL}/realms/${REALM}`;
  console.log(`Discovering OIDC config at: ${issuerUrl}`);

  const keycloakIssuer = await Issuer.discover(issuerUrl);
  console.log("OIDC discovery successful");

  oidcClient = new keycloakIssuer.Client({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uris: [`${APP_URL}/callback`],
    response_types: ["code"],
  });
}

function requireAuth(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}

app.get("/", (req, res) => {
  res.render("home", { user: req.session.user || null });
});

app.get("/login", (req, res) => {
  const nonce = generators.nonce();
  const state = generators.state();

  req.session.nonce = nonce;
  req.session.state = state;

  const authUrl = oidcClient.authorizationUrl({
    scope: "openid profile email",
    state,
    nonce,
  });

  // Replace internal Keycloak URL with external URL for browser redirect
  const externalAuthUrl = authUrl.replace(KEYCLOAK_URL, KEYCLOAK_EXTERNAL_URL);
  res.redirect(externalAuthUrl);
});

app.get("/callback", async (req, res) => {
  try {
    const params = oidcClient.callbackParams(req);
    const tokenSet = await oidcClient.callback(
      `${APP_URL}/callback`,
      params,
      {
        nonce: req.session.nonce,
        state: req.session.state,
      }
    );

    const userinfo = await oidcClient.userinfo(tokenSet.access_token);

    req.session.user = {
      sub: userinfo.sub,
      name: userinfo.name || userinfo.preferred_username,
      email: userinfo.email,
      username: userinfo.preferred_username,
      token: tokenSet.access_token,
    };

    delete req.session.nonce;
    delete req.session.state;

    res.redirect("/profile");
  } catch (err) {
    console.error("Authentication error:", err.message);
    res.redirect("/?error=auth_failed");
  }
});

app.get("/profile", requireAuth, (req, res) => {
  res.render("profile", { user: req.session.user });
});

app.get("/logout", (req, res) => {
  const idToken = req.session.id_token;
  req.session.destroy(() => {
    const logoutUrl = `${KEYCLOAK_EXTERNAL_URL}/realms/${REALM}/protocol/openid-connect/logout?post_logout_redirect_uri=${encodeURIComponent(APP_URL)}&client_id=${CLIENT_ID}`;
    res.redirect(logoutUrl);
  });
});

async function start() {
  let retries = 10;
  while (retries > 0) {
    try {
      await initializeOidc();
      break;
    } catch (err) {
      retries--;
      console.log(
        `Waiting for Keycloak... retries left: ${retries} (${err.message})`
      );
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  if (retries === 0) {
    console.error("Could not connect to Keycloak. Exiting.");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Demo app running at http://localhost:${PORT}`);
    console.log(`Keycloak admin: ${KEYCLOAK_EXTERNAL_URL}`);
  });
}

start();
