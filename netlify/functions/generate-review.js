exports.handler = async (event) => {
  try {
    const data = event.body ? JSON.parse(event.body) : {};

    const lengthMap = {
      short: "20 to 40 words",
      medium: "60 to 90 words",
      long: "100 to 140 words"
    };

    const selectedLength = lengthMap[data.length] || "60 to 90 words";

    if (!process.env.GEMINI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Configuration Error: GEMINI_API_KEY is missing." })
      };
    }

    // Pass the API key securely via the x-goog-api-key header
    const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
Generate exactly 3 completely different Google reviews.

Doctor: ${data.doctor || 'a professional'}
Location: ${data.location || 'the clinic'}
Treatment: ${data.treatment || 'the service'}
Comments: ${data.comment || ''}

Language: Write the review completely in ${data.language || 'English'}.

Length requirement:
Each review must be ${selectedLength}.

Formatting Rules:
Write one natural, first-person review as if the patient is sharing their own experience.
Use simple, human language and keep it personal. Include the doctor’s name, clinic name, relevant treatment keyword, SEO keywords naturally, and city. Mention the location only once.
Do not use numbered lists, multiple reviews, emojis, hashtags, prices, phone numbers, medical guarantees, or third-person wording. Avoid repetitive phrasing and make every review feel unique.
`
                }
              ]
            }
          ]
        })
      }
    );

    const result = await response.json();

    // Catch raw API errors returned directly from Google
    if (result.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Gemini API rejected request", details: result.error })
      };
    }

    if (!result.candidates || result.candidates.length === 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Gemini API structure failed", details: result })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        review: result.candidates[0].content.parts[0].text
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server internal breakdown",
        details: err.message
      })
    };
  }
};
