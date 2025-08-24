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
  reference?: string;
  arena_url?: string;
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
      `[${i + 1}] ${block.title}\nAre.na Block: https://www.are.na/block/${block.arena_id || block.id}\nOriginal URL: ${block.url}\nContent: ${block.content.substring(0, 1000)}...\n`
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
   - Link to the Are.na block (use the "Are.na Block" URLs provided in the context)

4. **What's Next** (1-2 sentences)
   - One actionable takeaway or question to consider
   - Future implications or areas to watch

GUIDELINES:
- Synthesize information rather than just summarizing individual pieces
- Find patterns and connections across this curated content  
- Include source attribution using Are.na block links (not original URLs)
- Make it valuable for understanding the themes and insights within this collection
- Avoid generic advice - focus on specific insights from the curated content
- When referencing sources, use markdown links with the specific Are.na Block URLs provided in the context above

Newsletter:`;
  }

  /**
   * Generate contextual chat response with intelligent curation companion approach
   */
  static chat(
    userMessage: string,
    context: ContextBlock[],
    channelTitle: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    isSpatialCanvas: boolean = false
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

    return `You are a helpful AI assistant that can discuss the curated content in this channel and respond naturally to conversation.

CURATED CONTENT FROM ${channelTitle.toUpperCase()}:
${contextText}

${contextText.trim() === '' ? '⚠️ NO CONTENT AVAILABLE - Tell the user their channel has no processable content.' : ''}

USER MESSAGE: ${userMessage}

CONVERSATION HISTORY:
${historyText}

RESPONSE GUIDELINES:
- Respond naturally to greetings and casual conversation without forcing content connections
- For greetings like "yo", "hey", "hi" - respond casually without referencing channel content
- For content questions - use the context blocks above to provide relevant insights
- When discussing channel content, use EXACT titles and properly formatted markdown links
- CLEARLY distinguish between channel content and general knowledge when both are relevant
- Match tone to channel vibe: ${channelVibe}
- ALWAYS format URLs as clickable markdown links [Title](URL) - never use bare URLs

${isSpatialCanvas ? `SPATIAL ARRANGEMENT COMMANDS:
If the user asks to arrange blocks spatially (e.g., "show as a spiral", "arrange in a timeline", "create a presentation"):
- Recognize these as ARRANGEMENT COMMANDS requiring a specific JSON response
- Available arrangements: timeline, importance, magazine, mood board, presentation, circle, heart, star, spiral
- Respond with: "I'll arrange your blocks in [pattern]. [Brief description of what this arrangement does]"
- Then IMMEDIATELY follow with the JSON on a new line:
\`\`\`json
{
  "type": "arrangement",
  "layoutType": "[appropriate layout]",
  "description": "[what this arrangement will show]"
}
\`\`\`
- Keep the explanation brief - focus on the visual arrangement, not content analysis
` : ''}
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
- Example: [Arin Documentation](https://docs.arin.im)
- CRITICAL: Every URL in your response must be clickable when rendered

BLOCK REFERENCE REQUIREMENTS:
- When referencing blocks, link to the original content (articles, videos, etc.) that users want to consume
- Reference thumbnails will automatically appear below showing Are.na block context
- Use natural language like "Wikipedia Vision" or "The Lore Zone" with links to actual content
- No need to mention "Block N" or create Are.na block links in text

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
      "What can I learn or discover from this?",
      "What patterns do you notice across this content?"
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

}

// Export commonly used types
export type TemplateType = 'newsletter' | 'chat' | 'research';