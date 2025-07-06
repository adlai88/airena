// AI prompt templates for content generation
export interface NewsletterOptions {
  tone?: 'professional' | 'casual' | 'analytical' | 'personal';
  length?: 'brief' | 'standard' | 'detailed';
  focus?: 'insights' | 'resources' | 'trends' | 'actionable';
}

export interface ContextBlock {
  title: string;
  url: string;
  content: string;
  similarity?: number;
}

export class PromptTemplates {
  
  /**
   * Generate newsletter from curated research blocks
   */
  static newsletter(
    context: ContextBlock[], 
    channelTitle: string,
    options: NewsletterOptions = {}
  ): string {
    const { tone = 'professional', length = 'standard', focus = 'insights' } = options;
    
    const toneMap = {
      professional: 'professional but approachable, like a research analyst',
      casual: 'conversational and friendly, like a knowledgeable peer',
      analytical: 'data-driven and precise, like a strategic consultant', 
      personal: 'reflective and thoughtful, like a curator sharing discoveries'
    };

    const lengthMap = {
      brief: 'Keep it concise - 2-3 key insights with brief explanations',
      standard: 'Provide substantial analysis - 4-5 insights with supporting details',
      detailed: 'Comprehensive coverage - 6-8 insights with deep analysis'
    };

    const focusMap = {
      insights: 'extracting key insights and patterns',
      resources: 'highlighting valuable tools and resources',
      trends: 'identifying emerging trends and developments',
      actionable: 'providing practical takeaways and next steps'
    };

    const contextText = context.map((block, i) => 
      `[${i + 1}] ${block.title}\nURL: ${block.url}\nContent: ${block.content.substring(0, 1000)}...\n`
    ).join('\n');

    return `You are creating a newsletter from curated content in the "${channelTitle}" collection.

CONTEXT FROM RESEARCH:
${contextText}

TASK: Create a newsletter focusing on ${focusMap[focus]}. Write in a ${toneMap[tone]} tone. ${lengthMap[length]}.

STRUCTURE:
1. **Executive Summary** (2-3 sentences capturing the main themes)

2. **Key Insights** (${length === 'brief' ? '2-3' : length === 'standard' ? '4-5' : '6-8'} bullet points)
   - Each insight should synthesize information across sources
   - Include specific examples or data points when available
   - Connect ideas between different pieces of content

3. **Notable Resources** (2-3 items)
   - Highlight the most valuable tools, articles, or references
   - Explain why each resource is worth attention
   - Include the source URL

4. **Looking Forward** (1-2 sentences)
   - One actionable takeaway or question to consider
   - Future implications or areas to watch

GUIDELINES:
- Synthesize information rather than just summarizing individual pieces
- Find patterns and connections across the curated content  
- Include source attribution with URLs
- Make it valuable for someone who curated this collection
- Avoid generic advice - focus on specific insights from curated content

Newsletter:`;
  }

  /**
   * Generate contextual chat response with intelligent curation companion approach
   */
  static chat(
    userMessage: string,
    context: ContextBlock[],
    channelTitle: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): string {
    const contextText = context.map((block, i) => 
      `[${i + 1}] ${block.title}\nURL: ${block.url}\nContent: ${block.content.substring(0, 800)}...\n`
    ).join('\n');

    const historyText = conversationHistory.length > 0 
      ? conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')
      : '';

    // Determine query specificity to guide response strategy
    const isExploratoryQuery = this.isExploratoryQuery(userMessage);
    const channelVibe = this.getChannelVibe(channelTitle);

    return `🚨 CRITICAL: You can ONLY discuss content from the context blocks below. You are NOT a general AI assistant.

CURATED CONTENT FROM ${channelTitle.toUpperCase()}:
${contextText}

${contextText.trim() === '' ? '⚠️ NO CONTENT AVAILABLE - Tell the user their channel has no processable content.' : ''}

USER QUESTION: ${userMessage}

CONVERSATION HISTORY:
${historyText}

🚨 ABSOLUTE RESTRICTIONS:
- You CANNOT mention topics not in the context blocks above
- You CANNOT provide generic examples, tips, or external knowledge  
- You CANNOT discuss "spice blends," "plating techniques," or cooking advice unless they appear in the user's blocks
- If context lacks information, say "I don't see that in your channel"

MANDATORY RESPONSE RULES:
1. ONLY reference titles, URLs, and content from the context blocks above
2. When listing items, use EXACT titles from the context (e.g., "Perfect Buttermilk Pancakes," "Breakfast Sausage Patties")  
3. Always include source URLs from the context
4. Match tone to channel vibe: ${channelVibe}
5. End with suggestions based on their actual content only

${isExploratoryQuery ? this.getExploratoryInstructions(channelVibe) : this.getSpecificInstructions()}

CORE MISSION: Help users discover THEIR curated collection. This is intelligence built from their taste, not generic AI knowledge.

FORMATTING GUIDELINES FOR VIDEOS:
- For YouTube videos, use EXACTLY the title provided in the context data - DO NOT make up or guess titles
- If the context shows a title like "Kevin O'Leary Startup Advice", use that exact title
- If the context only shows "YouTube Video" or similar, use the URL to extract the video ID
- Format as: **[Exact Title from Context]** followed by YouTube Video (videoId) on next line
- Example: **Kevin O'Leary's Startup Tips** \n   - YouTube Video (dHVMujryp40) \n   - Watch Here
- NEVER substitute one video's title for another - match titles to URLs precisely

FALLBACK APPROACH (use when no direct match):
When the context doesn't contain information to answer the user's question:
1. Be honest: "I don't see [specific topic] in your channel"
2. ONLY if there are related items in the collection, mention them: "However, I do see..."
3. Suggest what they could add to their channel if relevant
4. NEVER create examples or fill gaps with generic knowledge
5. Remember: Better to say "not found" than to hallucinate content not in their curation

Response:`;
  }

  /**
   * Determine if a query is exploratory vs specific
   */
  private static isExploratoryQuery(userMessage: string): boolean {
    const exploratoryTerms = [
      'show me', 'what', 'anything', 'something', 'cool', 'interesting', 
      'discover', 'explore', 'find', 'see', 'browse', 'random', 'surprise',
      'highlights', 'overview', 'summary', 'what do you', 'tell me about'
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    return exploratoryTerms.some(term => lowerMessage.includes(term)) || 
           userMessage.length < 30; // Short queries tend to be exploratory
  }

  /**
   * Determine channel vibe for response tone adaptation
   */
  private static getChannelVibe(channelTitle: string): string {
    const title = channelTitle.toLowerCase();
    
    if (title.includes('cool') || title.includes('random') || title.includes('fun')) {
      return 'playful and curious';
    } else if (title.includes('research') || title.includes('study') || title.includes('analysis')) {
      return 'analytical and thorough';
    } else if (title.includes('design') || title.includes('art') || title.includes('aesthetic')) {
      return 'visual and thoughtful';
    } else if (title.includes('startup') || title.includes('business') || title.includes('founder')) {
      return 'practical and insightful';
    } else {
      return 'engaging and knowledgeable';
    }
  }

  /**
   * Instructions for handling exploratory queries
   */
  private static getExploratoryInstructions(channelVibe: string): string {
    return `This is an exploratory query. Your approach:
- Lead with something immediately engaging from the content
- Surface 2-3 interesting highlights that showcase the collection's value
- Provide context about why these items are noteworthy
- Connect different pieces when possible to show patterns
- Use a ${channelVibe} tone
- Invite further exploration with specific follow-up suggestions`;
  }

  /**
   * Instructions for handling specific queries
   */
  private static getSpecificInstructions(): string {
    return `This is a specific query. Your approach:
- If you have relevant content, provide a direct, detailed answer
- If you have partial matches, answer what you can and surface related discoveries
- If no direct match exists, acknowledge this briefly then pivot to what IS interesting
- Always connect to actual content in the collection
- Provide specific examples and source attribution`;
  }

  /**
   * Get suggested questions that adapt to any channel title and encourage discovery
   */
  static getSuggestedQuestions(channelTitle: string): string[] {
    // Extract key terms from channel title for context-aware questions
    const title = channelTitle.toLowerCase();
    const channelName = channelTitle.replace(/^r[-:]?\s*/i, ''); // Remove "R:" or "r-" prefix
    
    // Exploratory questions that work for any content type and encourage discovery
    const exploratoryQuestions = [
      "Show me something cool",
      "What's interesting here?",
      "Surprise me with a discovery",
      "What stands out the most?",
      "What should I explore first?",
      "Give me the highlights"
    ];

    // Analytical questions for deeper exploration
    const analyticalQuestions = [
      `What patterns do you see in ${channelName}?`,
      "What are the key insights?",
      "What can I learn from this?",
      "How would you summarize this collection?"
    ];
    
    // Add contextual questions based on channel title hints
    const contextualQuestions = [];
    
    if (title.includes('cool') || title.includes('random') || title.includes('fun')) {
      contextualQuestions.push("Show me the coolest thing here", "What's the most unexpected item?");
    } else if (title.includes('recipe') || title.includes('cooking') || title.includes('food')) {
      contextualQuestions.push("What recipes look interesting?", "What cooking techniques are featured?");
    } else if (title.includes('startup') || title.includes('founder') || title.includes('business') || title.includes('vc')) {
      contextualQuestions.push("What advice stands out for founders?", "What business insights are here?");
    } else if (title.includes('design') || title.includes('art') || title.includes('creative')) {
      contextualQuestions.push("What design approaches are featured?", "Show me the most inspiring pieces");
    } else if (title.includes('education') || title.includes('learning') || title.includes('teach')) {
      contextualQuestions.push("What learning approaches are discussed?", "What educational resources stand out?");
    } else if (title.includes('tech') || title.includes('programming') || title.includes('code')) {
      contextualQuestions.push("What technologies are highlighted?", "What development insights are here?");
    }
    
    // Combine exploratory, analytical, and contextual questions
    const allQuestions = [...exploratoryQuestions.slice(0, 3), ...analyticalQuestions.slice(0, 2), ...contextualQuestions.slice(0, 1)];
    return allQuestions.slice(0, 6);
  }

  /**
   * Generate research report (future template)
   */
  static researchReport(
    context: ContextBlock[],
    channelTitle: string,
    topic: string
  ): string {
    const contextText = context.map((block, i) => 
      `[${i + 1}] ${block.title}\nURL: ${block.url}\nContent: ${block.content.substring(0, 1200)}...\n`
    ).join('\n');

    return `Create a comprehensive research report on "${topic}" based on curated research from "${channelTitle}".

RESEARCH SOURCES:
${contextText}

Generate a detailed report with:
1. Executive Summary
2. Key Findings (with evidence from sources)  
3. Analysis & Implications
4. Recommendations
5. Source Bibliography

Focus on synthesis and analysis rather than just summarization.`;
  }

  /**
   * Generate brainstorming ideas (future template)
   */
  static brainstorm(
    context: ContextBlock[],
    channelTitle: string,
    prompt: string
  ): string {
    const contextText = context.map((block, i) => 
      `[${i + 1}] ${block.title}\nURL: ${block.url}\nContent: ${block.content.substring(0, 600)}...\n`
    ).join('\n');

    return `Use the curated research from "${channelTitle}" to brainstorm ideas for: ${prompt}

INSPIRATION SOURCES:
${contextText}

Generate creative ideas that:
- Build on concepts from the research
- Connect ideas across different sources
- Are practical and actionable
- Reference specific inspiration points

Format as a list of ideas with brief explanations and source connections.`;
  }
}

// Export commonly used types
export type TemplateType = 'newsletter' | 'chat' | 'research' | 'brainstorm';