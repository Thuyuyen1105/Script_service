const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use the correct model name and configuration
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-pro",
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1024,
  },
});

async function generateScript(topic, audience, style, sources, language) {
  try {
    // Construct the prompt based on the inputs
    const prompt = constructPrompt(topic, audience, style, sources, language);
    
    // Generate content using Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(text);
    // Format the response
    return {
      scriptId: `script_${Date.now()}`,
      script: text,
      status: "generated"
    };
  } catch (error) {
    console.error('Error generating script:', error);
    throw new Error('Failed to generate script');
  }
}

function constructPrompt(topic, audience, style, sources, language) {
  // Combine sources into a coherent text
  const sourcesText = sources.map(source => 
    `From "${source.title}": ${source.content}`
  ).join('\n\n');

  // Construct the prompt with specific instructions based on audience and style
  const audienceGuide = getAudienceGuide(audience);
  const styleGuide = getStyleGuide(style);
  let lang = language;
  if (lang == "vi") {
    lang = "Vietnamese";
  } else {
    lang = "English";
  }

  return `
Create a script about "${topic}" with the following requirements:

Audience: ${audienceGuide}
Style: ${styleGuide}
Language: ${lang}

Based on these scientific sources:
${sourcesText}

Instructions:
- Keep the script under 200 words.
- Make it sound natural and smooth for a text-to-speech system.
- Use simple sentence structures that are easy to follow when spoken.
- Avoid special characters or formatting (e.g., bullet points, emojis, etc).
- Focus on clarity and flow.

Only return the final script. Do not include explanations.
`;
}

function getAudienceGuide(audience) {
  const guides = {
    kids: "Simple language, basic concepts, and fun examples suitable for children",
    teenager: "Clear explanations with relatable examples, avoiding overly complex terms",
    adult: "Balanced mix of technical and accessible language",
    expert: "Technical language and in-depth scientific concepts"
  };
  return guides[audience] || guides.adult;
}

function getStyleGuide(style) {
  const guides = {
    storytelling: "Create a narrative that weaves scientific concepts into an engaging story",
    educational: "Focus on clear, structured explanations with examples and key takeaways",
    casual: "Use conversational tone and relatable analogies",
    humorous: "Include appropriate humor and entertaining elements while maintaining accuracy"
  };
  return guides[style] || guides.educational;
}

async function splitScript(script) {
  try {
    const prompt = `
You are an AI assistant that processes short educational scripts and prepares them for image generation using Stable Diffusion.

Your task is:
1. Split the following script into short, meaningful segments (1-2 sentences each).
2. For each segment, create a descriptive and imaginative prompt suitable for generating an illustration or image using a text-to-image model like Stable Diffusion.
3. Make the prompt visually rich, context-aware, and free of abstract or non-visual words.
4. Use present-tense descriptions and avoid referencing the script or narration directly.

Script:
""" 
${script} 
"""


Return the result as a JSON array of objects with this format:
[
  {
    "text": "<segment of script>",
    "imagePrompt": "<visual description for image generation>"
  },
  ...
]
Only return the JSON array.
`.trim();

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up code block markers if present
    text = text.trim();
    if (text.startsWith('```')) {
      text = text.replace(/```json|```/g, '').trim();
    }

    // Safe parsing
    const segments = JSON.parse(text);
    return segments;
  } catch (err) {
    console.error('Error splitting script with AI:', err);
    throw new Error('Failed to split script using AI');
  }
}


module.exports = {
  generateScript,
  splitScript
};