/**
 * shadcn Popover / ToggleGroup / Checkbox（radix，portal 自带深色类）。
 */
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { Check } from 'lucide-react';
import { useColorMode } from '../../core/colorMode';
import { cn } from './ui';

export function SchnPopover(props: { open?: boolean; onOpenChange?: (v: boolean) => void; children: React.ReactNode }): JSX.Element {
  return (
    <PopoverPrimitive.Root open={props.open} onOpenChange={props.onOpenChange}>
      {props.children}
    </PopoverPrimitive.Root>
  );
}

export function SchnPopoverTrigger({ children }: { children: React.ReactElement }): JSX.Element {
  return <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>;
}

export function SchnPopoverContent({ children, className }: { children: React.ReactNode; className?: string }): JSX.Element {
  const darkClass = useColorMode() === 'dark' ? 'schn-dark' : '';
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={6}
        className={cn(
          'schn z-[100] rounded-md border border-zinc-200 bg-white p-2 shadow-lg',
          'dark:border-zinc-800 dark:bg-zinc-950',
          darkClass,
          className,
        )}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

export function SchnToggleGroup<T extends string>(props: {
  value: T;
  disabled?: boolean;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}): JSX.Element {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={props.value}
      disabled={props.disabled}
      onValueChange={(v) => {
        if (v) props.onChange(v as T);
      }}
      className="inline-flex items-center gap-0.5 rounded-md bg-zinc-100 p-0.5 text-xs dark:bg-zinc-800"
    >
      {props.options.map((o) => (
        <ToggleGroupPrimitive.Item
          key={o.value}
          value={o.value}
          className={cn(
            'rounded border-0 bg-transparent px-2 py-0.5 transition-colors focus-visible:outline-none disabled:opacity-50',
            'data-[state=on]:bg-white data-[state=on]:font-medium data-[state=on]:text-zinc-900 data-[state=on]:shadow-sm',
            'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
            'dark:data-[state=on]:bg-zinc-950 dark:data-[state=on]:text-zinc-50',
          )}
        >
          {o.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}

export function SchnCheckbox(props: { checked: boolean; onChange: () => void; label: string }): JSX.Element {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-900">
      <CheckboxPrimitive.Root
        checked={props.checked}
        onCheckedChange={props.onChange}
        className={cn(
          'flex h-3.5 w-3.5 items-center justify-center rounded border border-zinc-300 bg-white',
          'focus-visible:outline-none disabled:opacity-50',
          'data-[state=checked]:border-zinc-900 data-[state=checked]:bg-zinc-900 data-[state=checked]:text-zinc-50',
          'dark:border-zinc-700 dark:bg-zinc-950 dark:data-[state=checked]:border-zinc-50 dark:data-[state=checked]:bg-zinc-50 dark:data-[state=checked]:text-zinc-900',
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Check size={11} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span className="truncate text-zinc-900 dark:text-zinc-100">{props.label}</span>
    </label>
  );
}
