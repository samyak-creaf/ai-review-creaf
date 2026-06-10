exports.handler = async (event) => {
  try {
    const data = event.body ? JSON.parse(event.body) : {};

    const lengthMap = {
      short: "40 to 60 words",
      medium: "60 to 90 words",
      long: "100 to 140 words"
    };

    const selectedLength = lengthMap[data.length] || "60 to 90 words";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite-001:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
Generate exactly 3 completely different Google reviews.

Doctor: ${data.doctor}
Location: ${data.location}
Treatment: ${data.treatment}
Comments: ${data.comment}

Language: Write the review completely in ${data.language}.

Length requirement:
Each review must be ${selectedLength}.

Formatting Rules:
- Number each review as 1., 2., and 3.
- Separate each review with two line breaks.
- Natural, human tone
- Simple language
- Mention the location only once per review
- No emojis, hashtags, prices, or phone numbers
- No medical guarantees
- Write like a real person sharing experience
- Do not repeat sentences across reviews
`
                }
              ]
            }
          ]
        })
      }
    );

    const result = await response.json();

    if (!result.candidates) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Gemini API failed", details: result })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        review: result.candidates[0].content.parts[0].text
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server error",
        details: err.message
      })
    };
  }
};
