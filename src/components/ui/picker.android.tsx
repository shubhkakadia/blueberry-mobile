import { Picker as BasePicker, type PickerItemProps, type PickerItemValue, type PickerProps } from '@expo/ui';
import {
  DropdownMenuItem,
  ExposedDropdownMenu,
  ExposedDropdownMenuBox,
  Icon,
  OutlinedTextField,
  Shape,
  Text,
  type TextFieldRef,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth, menuAnchor, onVisibilityChanged } from '@expo/ui/jetpack-compose/modifiers';
import { Children, isValidElement, useEffect, useRef, useState, type ReactElement } from 'react';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Called, not written as JSX: the field reads the shape's type off the element, and only the returned one has it.
const FIELD_SHAPE = Shape.RoundedCorner({
  cornerRadii: { topStart: Radius.field, topEnd: Radius.field, bottomStart: Radius.field, bottomEnd: Radius.field },
});

/** `@expo/ui`'s Android picker with the same props, drawn to match `Input`: outlined, in the app's font, with a chevron. */
export function Picker<T extends PickerItemValue>({ selectedValue, onValueChange, enabled = true, children }: PickerProps<T>) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const field = useRef<TextFieldRef>(null);

  const items = Children.toArray(children)
    .filter((child): child is ReactElement<PickerItemProps<T>> => isValidElement(child) && child.type === BasePicker.Item)
    .map((child) => child.props);
  const selectedLabel = items.find((item) => item.value === selectedValue)?.label ?? '';

  // The field is uncontrolled, so the label is pushed in once it's on screen.
  useEffect(() => {
    if (visible) void field.current?.setText(selectedLabel);
  }, [selectedLabel, visible]);

  // The field would otherwise keep focus, and its heavier outline, after the menu closes.
  useEffect(() => {
    if (visible && !expanded) void field.current?.blur();
  }, [expanded, visible]);

  return (
    <ExposedDropdownMenuBox expanded={expanded} onExpandedChange={enabled ? setExpanded : undefined}>
      <OutlinedTextField
        ref={field}
        readOnly
        enabled={enabled}
        shape={FIELD_SHAPE}
        textStyle={{ fontFamily: FontFamily, fontSize: 16 }}
        colors={{
          focusedTextColor: theme.fg,
          unfocusedTextColor: theme.fg,
          disabledTextColor: theme.fgMuted,
          focusedContainerColor: theme.surfaceField,
          unfocusedContainerColor: theme.surfaceField,
          disabledContainerColor: theme.surfaceField,
          focusedIndicatorColor: theme.accent,
          unfocusedIndicatorColor: theme.border,
          disabledIndicatorColor: theme.border,
        }}
        modifiers={[menuAnchor(), fillMaxWidth(), onVisibilityChanged(setVisible)]}>
        <OutlinedTextField.TrailingIcon>
          <Icon source={require('@/assets/icons/expand-more.xml')} size={20} tint={theme.fgMuted} />
        </OutlinedTextField.TrailingIcon>
      </OutlinedTextField>
      <ExposedDropdownMenu expanded={expanded} containerColor={theme.surface} onDismissRequest={() => setExpanded(false)}>
        {items.map((item) => (
          <DropdownMenuItem
            key={String(item.value)}
            onClick={() => {
              onValueChange(item.value);
              setExpanded(false);
            }}>
            <DropdownMenuItem.Text>
              <Text color={theme.fg} style={{ fontFamily: FontFamily, fontSize: 16 }}>
                {item.label}
              </Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
        ))}
      </ExposedDropdownMenu>
    </ExposedDropdownMenuBox>
  );
}

Picker.Item = BasePicker.Item;
