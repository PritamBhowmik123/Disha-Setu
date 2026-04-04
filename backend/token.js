const axios = require("axios");
const qs = require("querystring");

async function getToken() {
  try {
    const res = await axios.post(
      "https://api.miro.com/v1/oauth/token",
      qs.stringify({
        grant_type: "authorization_code",
        client_id: "3458764666488274226",
        client_secret: "gpV0DqzRn4hCAduleWsfCKsuPWuYntiM",
        code: "eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_FUupRk",
        redirect_uri: "http://localhost:3000"
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    console.log(res.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}

getToken();