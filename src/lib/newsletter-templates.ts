// Template definitions for content generation

export interface NewsletterTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  defaultOptions: {
    tone: 'professional' | 'casual' | 'analytical' | 'personal';
    length: 'brief' | 'standard' | 'detailed';
    focus: 'insights' | 'resources' | 'trends' | 'actionable';
  };
}

export const NEWSLETTER_TEMPLATES: NewsletterTemplate[] = [
  {
    id: 'newsletter',
    name: 'Newsletter',
    description: 'A roundup of key insights and actionable takeaways from your are.na content',
    prompt: `You are creating a professional newsletter from curated research blocks.

Create a newsletter with the following structure:

# {channel_title} - Research Newsletter

## Executive Summary
[2-3 sentences summarizing the main themes and key findings]

## Key Insights
[3-5 bullet points highlighting the most important discoveries, trends, or insights]

## Notable Resources
[2-3 selected resources with brief descriptions of why they're valuable]

## Actionable Takeaways
[1-2 specific actions readers can take based on this research]

---
*Generated from {block_count} curated sources*

Style: {tone}, {length} format, focused on {focus}
Make it engaging and professional, suitable for sharing with colleagues or stakeholders.`,
    defaultOptions: {
      tone: 'professional',
      length: 'standard',
      focus: 'insights'
    }
  }
];

export function getTemplate(templateId: string): NewsletterTemplate | undefined {
  return NEWSLETTER_TEMPLATES.find(t => t.id === templateId);
}

export function buildPrompt(
  template: NewsletterTemplate, 
  channelTitle: string, 
  blockCount: number,
  options: NewsletterTemplate['defaultOptions']
): string {
  return template.prompt
    .replace('{channel_title}', channelTitle)
    .replace('{block_count}', blockCount.toString())
    .replace('{tone}', options.tone)
    .replace('{length}', options.length)
    .replace('{focus}', options.focus);
}