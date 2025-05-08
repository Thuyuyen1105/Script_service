const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

console.log('Initializing Gemini API...');
console.log('API Key exists:', !!process.env.GEMINI_API_KEY);

// Initialize the Gemini API
let genAI;
try {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  console.log('Gemini API initialized successfully');
} catch (error) {
  console.error('Failed to initialize Gemini API:', error);
  throw error;
}

// Use the correct model name and configuration
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1024,
  },
});

async function generateScript(topic, audience, style, sources, language, length) {
  try {
    console.log('Starting script generation with params:', {
      topic,
      audience,
      style,
      language,
      length,
      sourcesCount: sources?.length
    });

    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Validate inputs
    if (!topic || !audience || !style || !sources || !language || !length) {
      console.error('Missing parameters:', {
        topic: !topic,
        audience: !audience,
        style: !style,
        sources: !sources,
        language: !language,
        length: !length
      });
      throw new Error('Missing required parameters for script generation');
    }

    // Construct the prompt based on the inputs
    console.log('Constructing prompt...');
    const prompt = constructPrompt(topic, audience, style, sources, language, length);
    console.log('Prompt constructed successfully');
    
    // Generate content using Gemini
    console.log('Calling Gemini API...');
    const result = await model.generateContent(prompt);
    console.log('Received response from Gemini API');
    
    const response = await result.response;
    const text = response.text();
    const scriptId= response.scriptId;

    if (!text) {
      console.error('Empty response received from Gemini API');
      throw new Error('Empty response from Gemini API');
    }

    console.log('Generated script successfully, length:', text.length);
    console.log("script", text);

    // Format the response
    return {
      script: text,
      status: "generated"
    };
  } catch (error) {
    console.error('Error in generateScript:', {
      error: error.message,
      stack: error.stack,
      params: { topic, audience, style, language, length }
    });
    throw error; // Re-throw the error with full details
  }
}

function constructPrompt(topic, audience, style, sources, language, length) {
  // Combine sources into a coherent text
  const sourcesText = sources.map(source => 
    `From "${source.title}": ${source.content}`
  ).join('\n\n');

  // Construct the prompt with specific instructions based on audience and style
  const audienceGuide = getAudienceGuide(audience);
  const styleGuide = getStyleGuide(style);
  let lang = language;
  if (lang == "vi-VN") {
    lang = "Vietnamese";
  } else {
    lang = "English";
  }
  let scriptLength;
  switch (length) {
    case 'veryshort':
      scriptLength = 100; // Example: 100 words
      break;
    case 'short':
      scriptLength = 150; // Example: 300 words
      break;
    case 'medium':
      scriptLength = 250; // Example: 600 words
      break;
    case 'long':
      scriptLength =400 ; // Example: 1000 words
      break;
    default:
      throw new Error('Invalid length value');
  }

  return `
Create a script about "${topic}" with the following requirements:

Audience: ${audienceGuide}
Style: ${styleGuide}
Language: ${lang}

Based on these scientific sources:
${sourcesText}

Instructions:
- Keep the script about ${scriptLength} words.
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
    funny: "Include appropriate humor and entertaining elements while maintaining accuracy"
  };
  return guides[style] || guides.educational;
}

async function splitScript(script) {
  try {
    const prompt = `
You are an AI assistant that processes short educational scripts and prepares them for image generation using Stable Diffusion.

Your task is:
1. Split the following script into short, meaningful segments (2-4 sentences each).
2. For each segment, create a descriptive and imaginative prompt suitable for generating an illustration or image using a text-to-image model like Stable Diffusion.
3. Make the prompt visually rich, context-aware, and free of abstract or non-visual words.
4. Use present-tense descriptions and avoid referencing the script or narration directly.
5. Create as least segments as possible.


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