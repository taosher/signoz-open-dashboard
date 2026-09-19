/**
 * shadcn Select（radix）。portal 内容自带 `.schn(-dark)` 类，
 * 脱离主题包裹层时深色仍生效。
 */
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useColorMode } from '../../core/colorMode';
import { cn } from './ui';

export function SchnSelectRoot(props: {
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}): JSX.Element {
  const darkClass = useColorMode() === 'dark' ? 'schn-dark' : '';
  return (
    <SelectPrimitive.Root value={props.value} onValueChange={props.onChange} disabled={props.disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-7 items-center justify-between gap-2 overflow-hidden rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900',
          'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50',
          props.className,
        )}
      >
        <SelectPrimitive.Value className="block min-w-0 flex-1 truncate text-left" />
        <SelectPrimitive.Icon>
          <ChevronDown size={13} className="opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'schn schn-scroll z-[100] max-h-64 min-w-[140px] overflow-auto rounded-md border border-zinc-200 bg-white p-1 shadow-lg',
            'dark:border-zinc-800 dark:bg-zinc-950',
            darkClass,
          )}
        >
          <SelectPrimitive.Viewport>{props.children}</SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function SchnSelectItem({ value, label }: { value: string; label: string }): JSX.Element {
  return (
    <SelectPrimitive.Item
      value={value}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm py-1 pl-6 pr-2 text-xs text-zinc-900',
        'focus:bg-zinc-100 focus:outline-none data-[disabled]:opacity-50',
        'dark:text-zinc-50 dark:focus:bg-zinc-900',
      )}
    >
      <SelectPrimitive.ItemIndicator className="absolute left-1 inline-flex items-center">
        <Check size={13} />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
