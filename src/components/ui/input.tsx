import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

interface NicknameInputProps extends React.ComponentProps<typeof Input> {
    onClear?: () => void;
    containerClassName?: string;
    clearButtonClassName?: string;
}

const NicknameInput = React.forwardRef<HTMLInputElement, NicknameInputProps>(
    ({ className, value, onChange, onClear, containerClassName, clearButtonClassName, ...props }, ref) => {
        const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
            e.target.select();
        };

        const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
            if (document.activeElement !== e.currentTarget) {
                e.currentTarget.focus();
                e.currentTarget.select();
                e.preventDefault();
            }
        };

        const hasValue = typeof value === "string" && value.length > 0;

        return (
            <div className={cn("relative w-full flex items-center", containerClassName)}>
                <Input
                    value={value}
                    onChange={onChange}
                    onFocus={handleFocus}
                    onMouseDown={handleMouseDown}
                    className={cn(hasValue && onClear && "pr-9", className)}
                    ref={ref}
                    {...props}
                />
                {hasValue && onClear && (
                    <button
                        type="button"
                        onClick={onClear}
                        className={cn(
                            "absolute right-3 text-muted-foreground hover:text-foreground focus:outline-none transition-colors z-10",
                            clearButtonClassName
                        )}
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        )
    }
)
NicknameInput.displayName = "NicknameInput"

export { Input, NicknameInput }

