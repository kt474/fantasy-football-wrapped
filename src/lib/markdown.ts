import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

export const renderMarkdown = (value: string) =>
  DOMPurify.sanitize(markdown.render(value));
