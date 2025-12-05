'use client';

import * as React from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoScroll } from "@/components/hooks/use-auto-scroll";

interface ChatMessageListProps extends React.HTMLAttributes<HTMLDivElement> {
  smooth?: boolean;
}

const ChatMessageList = React.forwardRef<HTMLDivElement, ChatMessageListProps>(
  ({ className, children, smooth = false, ...props }, ref) => {
    const {
      scrollRef,
      isAtBottom,
      autoScrollEnabled,
      scrollToBottom,
      disableAutoScroll,
    } = useAutoScroll({
      smooth,
      content: children,
    });

    React.useImperativeHandle(ref, () => scrollRef.current as HTMLDivElement, [
      scrollRef,
    ]);

    return (
      <div className="relative h-full w-full">
        <div
          className={`flex h-full w-full flex-col gap-2 overflow-y-auto p-4 scrollbar-hide ${className ?? ""}`}
          ref={scrollRef}
          onWheel={disableAutoScroll}
          onTouchMove={disableAutoScroll}
          {...props}
        >
          {children}
        </div>
        {!isAtBottom && (
          <Button
            onClick={() => {
              scrollToBottom();
            }}
            size="icon"
            variant="outline"
            className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 rounded-full shadow-md"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
        {!autoScrollEnabled && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>
    );
  },
);

ChatMessageList.displayName = "ChatMessageList";

export { ChatMessageList };

