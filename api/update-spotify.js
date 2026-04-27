export default async function handler(req, res) {
  const {
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REFRESH_TOKEN,
    FIREBASE_MUSIC_URL
  } = process.env;

  try {
    // Get access token
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization":
          "Basic " +
          Buffer.from(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: SPOTIFY_REFRESH_TOKEN
      })
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Get current song
    const nowPlaying = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: { Authorization: "Bearer " + accessToken }
      }
    );

    if (nowPlaying.status === 204) {
      await fetch(FIREBASE_MUSIC_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playing: false,
          title: "Nothing Playing",
          artist: "",
          cover: ""
        })
      });

      return res.status(200).json({ playing: false });
    }

    const data = await nowPlaying.json();

    const music = {
      playing: data.is_playing,
      title: data.item.name,
      artist: data.item.artists.map(a => a.name).join(", "),
      cover: data.item.album.images[0].url
    };

    // Push to Firebase
    await fetch(FIREBASE_MUSIC_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(music)
    });

    res.status(200).json(music);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
