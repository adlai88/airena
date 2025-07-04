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
   * Generate contextual chat response
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

    return `You are an intelligent assistant with access to curated content from "${channelTitle}".

CONVERSATION HISTORY:
${historyText}

RELEVANT CONTENT FROM ${channelTitle.toUpperCase()}:
${contextText}

USER QUESTION: ${userMessage}

INSTRUCTIONS:
- Answer based ONLY on the specific content provided above
- Be specific about what you actually found in the ${channelTitle} content
- Reference specific sources with URLs when relevant  
- If the provided content doesn't contain relevant information, say "I don't see specific information about [their question] in the ${channelTitle} content I have access to"
- Be conversational but grounded in the actual content provided
- Don't give generic advice - reference specific items, examples, or information from the content
- Include source attribution for specific details or quotes
- Adapt your language to match the content type (if it's about recipes, talk about recipes; if it's about startups, talk about startups, etc.)

Response:`;
  }

  /**
   * Get suggested questions that adapt to any channel title
   */
  static getSuggestedQuestions(channelTitle: string): string[] {
    // Extract key terms from channel title for context-aware questions
    const title = channelTitle.toLowerCase();
    const channelName = channelTitle.replace(/^r[-:]?\s*/i, ''); // Remove "R:" or "r-" prefix
    
    // Base questions that work for any content type
    const baseQuestions = [
      `What do you know about ${channelName}?`,
      "What are the main topics covered?",
      "What can I learn from this channel?",
      "What are the key insights?",
      "What stands out the most?",
      "How would you summarize this content?"
    ];
    
    // Add contextual questions based on channel title hints
    const contextualQuestions = [];
    
    if (title.includes('recipe') || title.includes('cooking') || title.includes('food')) {
      contextualQuestions.push("What recipes are included?", "What ingredients are commonly used?");
    } else if (title.includes('startup') || title.includes('founder') || title.includes('business') || title.includes('vc')) {
      contextualQuestions.push("What advice is given to founders?", "What business strategies are discussed?");
    } else if (title.includes('design') || title.includes('art') || title.includes('creative')) {
      contextualQuestions.push("What design principles are featured?", "What creative techniques are shown?");
    } else if (title.includes('education') || title.includes('learning') || title.includes('teach')) {
      contextualQuestions.push("What educational approaches are discussed?", "What learning resources are available?");
    } else if (title.includes('tech') || title.includes('programming') || title.includes('code')) {
      contextualQuestions.push("What technologies are featured?", "What development practices are discussed?");
    }
    
    // Combine base questions with contextual ones, limit to 6 total
    const allQuestions = [...baseQuestions, ...contextualQuestions];
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