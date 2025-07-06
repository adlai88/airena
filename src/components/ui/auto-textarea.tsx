himport * as React from "react";
import { cn } from "@/lib/utils";

export type AutoTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  maxRows?: number;
};

export const AutoTextarea = React.forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ className, maxRows = 6, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    React.useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const target = e.target;
      target.style.height = "auto";
      const lineHeight = parseInt(window.getComputedStyle(target).lineHeight || "20", 10);
      const maxHeight = lineHeight * maxRows;
      target.style.height = Math.min(target.scrollHeight, maxHeight) + "px";
      if (props.onInput) props.onInput(e);
      if (props.onChange) props.onChange(e);
    };

    React.useEffect(() => {
      if (textareaRef.current) {
        const target = textareaRef.current;
        target.style.height = "auto";
        const lineHeight = parseInt(window.getComputedStyle(target).lineHeight || "20", 10);
        const maxHeight = lineHeight * maxRows;
        target.style.height = Math.min(target.scrollHeight, maxHeight) + "px";
      }
    }, [props.value, maxRows]);

    return (
      <textarea
        ref={textareaRef}
        rows={1}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none min-h-[40px] max-h-[240px]",
          className
        )}
        onInput={handleInput}
        {...props}
      />
    );
  }
);
AutoTextarea.displayName = "AutoTextarea"; 