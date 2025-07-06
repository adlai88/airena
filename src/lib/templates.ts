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
- If content appears to be error pages (404, "page not found"), acknowledge this honestly

MANDATORY RESPONSE RULES:
1. ONLY reference titles, URLs, and content from the context blocks above
2. When listing items, use EXACT titles from the context (e.g., "Perfect Buttermilk Pancakes," "Breakfast Sausage Patties")  
3. Always include source URLs from the context
4. If you have limited content (1-2 items), be honest: "You have [X] items in this channel..."
5. If content quality is poor (404s, errors), suggest re-syncing or adding new content
6. Match tone to channel vibe: ${channelVibe}
7. End with content-based suggestions or ways to improve the channel

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
3. If channel is mostly empty or has error content, acknowledge this honestly
4. Suggest what they could add or mention re-syncing if content seems outdated
5. NEVER create examples or fill gaps with generic knowledge
6. Remember: Better to say "not found" than to hallucinate content not in their curation

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
- If content exists: Lead with 1-2 immediately engaging items from the actual content
- If content is limited/poor: Be honest about what's actually available
- ONLY mention items that exist in the context blocks
- Connect pieces when multiple quality items exist
- If only 1-2 items exist, focus on what makes them noteworthy
- Use a ${channelVibe} tone
- For follow-ups, suggest what they could add to improve their channel`;
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
   * Get content-safe suggested questions that always have reasonable answers
   */
  static getSuggestedQuestions(channelTitle: string): string[] {
    // Extract key terms from channel title for context-aware questions
    const title = channelTitle.toLowerCase();
    
    // Core questions that work with any amount of content (even 1 item)
    const safeExploratoryQuestions = [
      "What's in this channel?",
      "Show me what you have",
      "What did I save here?",
      "Tell me about this collection"
    ];

    // Content-safe analytical questions that work with limited content
    const safeAnalyticalQuestions = [
      "What stands out most?",
      "Which item looks most interesting?",
      "What should I explore first?"
    ];
    
    // Context-specific questions that are content-safe
    const contextualQuestions = [];
    
    if (title.includes('recipe') || title.includes('cooking') || title.includes('food')) {
      contextualQuestions.push("What food content is here?", "Tell me about these recipes");
    } else if (title.includes('startup') || title.includes('founder') || title.includes('business') || title.includes('vc')) {
      contextualQuestions.push("What business content did I save?", "Show me the startup resources");
    } else if (title.includes('design') || title.includes('art') || title.includes('creative')) {
      contextualQuestions.push("What design content is here?", "Show me the creative pieces");
    } else if (title.includes('tech') || title.includes('programming') || title.includes('code')) {
      contextualQuestions.push("What tech content did I save?", "Tell me about the technical resources");
    } else if (title.includes('research') || title.includes('study') || title.includes('learning')) {
      contextualQuestions.push("What research is in here?", "Show me the learning resources");
    } else {
      // Generic fallbacks that work for any content type
      contextualQuestions.push("What type of content is this?", "Describe this collection");
    }
    
    // Combine 2 safe exploratory + 2 safe analytical + 2 contextual
    const allQuestions = [
      ...safeExploratoryQuestions.slice(0, 2),
      ...safeAnalyticalQuestions.slice(0, 2), 
      ...contextualQuestions.slice(0, 2)
    ];
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