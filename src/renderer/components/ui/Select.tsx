/**
 * Modern Select Component
 * Material Design inspired dropdown with clean aesthetics
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
    value: string;
    label: string;
    description?: string;
    icon?: string;
    badge?: string;
    disabled?: boolean;
}

interface SelectProps {
    options: SelectOption[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    error?: boolean;
    label?: string;
    required?: boolean;
}

export const Select: React.FC<SelectProps> = ({
    options,
    value,
    onValueChange,
    placeholder = "Select an option",
    disabled = false,
    className,
    error = false,
    label,
    required = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const selectRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(option => option.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setFocusedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && dropdownRef.current && focusedIndex >= 0) {
            const focusedElement = dropdownRef.current.children[focusedIndex] as HTMLElement;
            if (focusedElement) {
                focusedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [focusedIndex, isOpen]);

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (disabled) return;

        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else if (focusedIndex >= 0 && !options[focusedIndex].disabled) {
                    onValueChange(options[focusedIndex].value);
                    setIsOpen(false);
                    setFocusedIndex(-1);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setFocusedIndex(-1);
                break;
            case 'ArrowDown':
                event.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else {
                    const nextIndex = Math.min(focusedIndex + 1, options.length - 1);
                    setFocusedIndex(nextIndex);
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (isOpen) {
                    const prevIndex = Math.max(focusedIndex - 1, 0);
                    setFocusedIndex(prevIndex);
                }
                break;
            case 'Tab':
                setIsOpen(false);
                setFocusedIndex(-1);
                break;
        }
    };

    const handleOptionClick = (option: SelectOption) => {
        if (!option.disabled) {
            onValueChange(option.value);
            setIsOpen(false);
            setFocusedIndex(-1);
        }
    };

    return (
        <div className={cn("relative", className)} ref={selectRef}>
            {label && (
                <label className="block text-sm font-medium text-foreground mb-2">
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </label>
            )}

            {/* Select Trigger */}
            <div
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                tabIndex={disabled ? -1 : 0}
                className={cn(
                    // Base styles
                    "relative w-full min-h-[44px] px-4 py-3 bg-secondary/30",
                    "border rounded-xl text-left cursor-pointer",
                    "transition-all duration-200 ease-in-out",
                    "flex items-center justify-between gap-3",

                    // Focus styles
                    "focus:outline-none focus:ring-2 focus:ring-primary/20",

                    // Border styles
                    error
                        ? "border-destructive focus:border-destructive"
                        : isOpen
                            ? "border-primary shadow-md"
                            : "border-input hover:border-accent",

                    // Disabled styles
                    disabled && "opacity-50 cursor-not-allowed bg-muted",

                    // Shadow
                    "shadow-sm hover:shadow-md transition-shadow"
                )}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {selectedOption ? (
                        <>
                            {selectedOption.icon && (
                                <span className="text-lg flex-shrink-0">{selectedOption.icon}</span>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground truncate">
                                        {selectedOption.label}
                                    </span>
                                    {selectedOption.badge && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                            {selectedOption.badge}
                                        </span>
                                    )}
                                </div>
                                {selectedOption.description && (
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {selectedOption.description}
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        <span className="text-sm text-muted-foreground">
                            {placeholder}
                        </span>
                    )}
                </div>

                <ChevronDown
                    className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform duration-200 flex-shrink-0",
                        isOpen && "transform rotate-180"
                    )}
                />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2">
                    <div
                        ref={dropdownRef}
                        role="listbox"
                        className={cn(
                            "bg-popover border border-border",
                            "rounded-xl shadow-lg overflow-hidden",
                            "max-h-64 overflow-y-auto",
                            "animate-in fade-in-0 zoom-in-95 duration-200"
                        )}
                    >
                        {options.map((option, index) => (
                            <div
                                key={option.value}
                                role="option"
                                aria-selected={value === option.value}
                                className={cn(
                                    "relative px-4 py-3 cursor-pointer transition-colors duration-150",
                                    "flex items-center gap-3",

                                    // Hover and focus states
                                    index === focusedIndex && "bg-accent/50",
                                    !option.disabled && "hover:bg-accent/50",

                                    // Selected state
                                    value === option.value && "bg-accent",

                                    // Disabled state
                                    option.disabled && "opacity-50 cursor-not-allowed",

                                    // Border
                                    index !== options.length - 1 && "border-b border-border"
                                )}
                                onClick={() => handleOptionClick(option)}
                                onMouseEnter={() => setFocusedIndex(index)}
                            >
                                {option.icon && (
                                    <span className="text-lg flex-shrink-0">{option.icon}</span>
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-sm font-medium truncate",
                                            value === option.value
                                                ? "text-primary"
                                                : "text-foreground"
                                        )}>
                                            {option.label}
                                        </span>
                                        {option.badge && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                {option.badge}
                                            </span>
                                        )}
                                    </div>
                                    {option.description && (
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {option.description}
                                        </p>
                                    )}
                                </div>

                                {value === option.value && (
                                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Select;
