import { Collapsible as CollapsiblePrimitive } from 'bits-ui';
import Content from './collapsible-content.svelte';

const { Root } = CollapsiblePrimitive;
const { Trigger } = CollapsiblePrimitive;

export {
  Root,
  Content,
  Trigger,
  //
  Root as Collapsible,
  Content as CollapsibleContent,
  Trigger as CollapsibleTrigger
};
