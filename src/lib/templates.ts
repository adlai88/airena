// AI prompt templates for content generation
export interface NewsletterOptions {
  tone?: 'professional' | 'casual' | 'analytical' | 'personal';
  length?: 'brief' | 'standard' | 'detailed';
  focus?: 'insights' | 'resources' | 'connections' | 'actionable';
}

export interface ContextBlock {
  title: string;
  url: string;
  content: string;
  similarity?: number;
  image_url?: string;
  id?: number;
  arena_id?: number;
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
      connections: 'finding relationships and connections between ideas',
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
1. **Overview** (2-3 sentences capturing the main themes)

2. **Key Insights** (${length === 'brief' ? '2-3' : length === 'standard' ? '4-5' : '6-8'} bullet points)
   - Each insight should synthesize information across sources
   - Include specific examples or data points when available
   - Connect ideas between different pieces of content

3. **Notable Resources** (2-3 items)
   - Highlight the most valuable tools, articles, or references
   - Explain why each resource is worth attention
   - Include the source URL

4. **What's Next** (1-2 sentences)
   - One actionable takeaway or question to consider
   - Future implications or areas to watch

GUIDELINES:
- Synthesize information rather than just summarizing individual pieces
- Find patterns and connections across this curated content  
- Include source attribution with URLs
- Make it valuable for understanding the themes and insights within this collection
- Avoid generic advice - focus on specific insights from the curated content

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

🚨 KNOWLEDGE BOUNDARY RULES:
- ALWAYS prioritize and lead with content from the context blocks above
- When context lacks information, you MAY provide general knowledge as helpful fallback
- CLEARLY distinguish between channel content and general knowledge in responses
- If content appears to be error pages, acknowledge this honestly
- NEVER invent or hallucinate content about what's in this collection

RESPONSE HIERARCHY:
1. FIRST: Search for relevant content in the context blocks above
2. LEAD with channel content when available, using EXACT titles and properly formatted markdown links
3. CLEARLY LABEL: "Based on this collection..." vs "From general knowledge..."
4. If providing general knowledge, REDIRECT back to channel content when possible
5. Match tone to channel vibe: ${channelVibe}
6. End with invitations to explore specific items or related channel content
7. NEVER start with "You have X items" - jump into actual insights
8. ALWAYS format URLs as clickable markdown links [Title](URL) - never use bare URLs

${isExploratoryQuery ? this.getExploratoryInstructions(channelVibe) : this.getSpecificInstructions()}

CORE MISSION: Help users discover insights from this curated collection FIRST, but provide helpful general knowledge when needed. Always distinguish between curated content and general knowledge. Act as a knowledgeable guide, not a presumptuous curator.

FORMATTING GUIDELINES FOR VIDEOS:
- For YouTube videos, use EXACTLY the title provided in the context data - DO NOT make up or guess titles
- If the context shows a title like "Kevin O'Leary Startup Advice", use that exact title
- If the context only shows "YouTube Video" or similar, use the URL to extract the video ID
- Format as: **[Exact Title from Context]** followed by YouTube Video (videoId) on next line
- Example: **Kevin O'Leary's Startup Tips** \n   - YouTube Video (dHVMujryp40) \n   - Watch Here
- NEVER substitute one video's title for another - match titles to URLs precisely

LINK FORMATTING REQUIREMENTS:
- ALL URLs must be formatted as clickable markdown links: [Title](URL)
- NEVER output bare URLs like "https://example.com" - always use markdown format
- Use the exact title from the context blocks when available
- For websites: [Article Title](URL) or [Website Name](URL)
- For Are.na blocks: [Block Title](https://www.are.na/block/ID)
- Example: [Sam Altman's Startup Tips](https://www.youtube.com/watch?v=dHVMujryp40)
- Example: [Airena Documentation](https://docs.airena.app)
- CRITICAL: Every URL in your response must be clickable when rendered

HYBRID KNOWLEDGE APPROACH (when expanding beyond channel content):
When the context provides partial information or the user asks broader questions:
1. LEAD WITH COLLECTION: "Based on this collection, [relevant content from context]..."
2. EXPAND WITH GENERAL: "From general knowledge, [additional context and insights]..."
3. CONNECT THE DOTS: Show how general knowledge relates to or enhances the curated content
4. BRIDGE BACK TO CHANNEL: "This connects to [specific items] in this collection"
5. ENHANCE VALUE: Position both sources as complementary, not competing
6. MAINTAIN DISTINCTION: Keep curated insights clearly separate from general knowledge

🔗 FINAL REMINDER: Format ALL URLs as clickable markdown links [Title](URL) - this is critical for user experience.

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
- Jump straight into the most interesting content from this collection
- If the collection has rich content: Highlight 2-3 fascinating items with enthusiasm
- If content seems limited: Mention what the collection contains without suggesting changes
- If channel appears empty: Acknowledge briefly and focus on what could be explored
- NEVER lead with "You have X items" - users can see their own content count
- Use a ${channelVibe} tone that matches the content
- Focus on discovery and insight, not inventory management
- Act as a guide to this collection, not a curator suggesting improvements`;
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
   * Get streamlined, universal questions optimized for good answers across all content types
   */
  static getSuggestedQuestions(): string[] {
    // Universal patterns that work for text, images, videos, and any content type
    // Designed to succeed at vector search while being semantically rich
    return [
      "What are the main themes in this collection?",
      "What's most interesting or notable here?", 
      "What patterns do you notice across this content?",
      "What can I learn or discover from this?"
    ];
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