exports.handler = async (event) => {
  const json = (statusCode, payload) => ({
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  try {
    const data = event.body ? JSON.parse(event.body) : {};

    if (!process.env.GEMINI_API_KEY) {
      return json(500, {
        error: "Configuration error: GEMINI_API_KEY is missing."
      });
    }

    const lengthMap = {
      short: "20 to 40 words",
      medium: "60 to 90 words",
      long: "100 to 140 words"
    };

    const selectedLength = lengthMap[data.length] || lengthMap.medium;
    const doctor = data.doctor || "the doctor";
    const clinic = data.clinic || data.clinicName || data.location || "the clinic";
    const city = data.city || "";
    const treatment = data.treatment || "treatment";
    const comments = data.comment || "";
    const language = data.language || "English";

    const seoKeywords = Array.isArray(data.keywords)
      ? data.keywords.filter(Boolean).join(", ")
      : (data.keywords || data.seoKeywords || "");

    const prompt = `
Write exactly ONE Google review in ${language}.

Details:
- Doctor name: ${doctor}
- Clinic name: ${clinic}
- City: ${city || "Not provided"}
- Treatment: ${treatment}
- Patient comments: ${comments || "Not provided"}
- SEO keywords to weave in naturally: ${seoKeywords || "Not provided"}

Requirements:
- Length: ${selectedLength}.
- Write only the review text—no title, label, bullets, numbering, quotation marks, or explanation.
- Write in first person, as one patient describing their own experience.
- Use a natural, simple, conversational tone.
- Mention the doctor name, clinic name, treatment-related keyword, city, and supplied SEO keywords naturally.
- Mention the city/location only once.
- Do not use third-person wording, emojis, hashtags, prices, phone numbers, or medical guarantees.
- Do not invent diagnoses, outcomes, or facts not supplied by the patient.
- Make the wording feel original and non-repetitive.
`;

    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 350
          }
        })
      }
    );

    const rawBody = await response.text();
    let result;

    try {
      result = JSON.parse(rawBody);
    } catch {
      return json(502, {
        error: "Gemini returned a non-JSON response.",
        status: response.status,
        details: rawBody.slice(0, 500)
      });
    }

    if (!response.ok || result.error) {
      console.error("Gemini API error:", JSON.stringify(result.error || result));

      return json(response.status || 502, {
        error: "Gemini API rejected the request.",
        details: result.error || result
      });
    }

    const review = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!review) {
      return json(502, {
        error: "Gemini returned no review text.",
        details: result
      });
    }

    return json(200, { review });

  } catch (err) {
    console.error("Review generator error:", err);

    return json(500, {
      error: "Server internal error.",
      details: err.message
    });
  }
};
