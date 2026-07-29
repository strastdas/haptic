import { Tooltip as TooltipPrimitive } from 'bits-ui';
import Content from './tooltip-content.svelte';

const { Root } = TooltipPrimitive;
const { Trigger } = TooltipPrimitive;
const { Arrow } = TooltipPrimitive;

export {
  Root,
  Trigger,
  Content,
  Arrow,
  //
  Root as Tooltip,
  Content as TooltipContent,
  Trigger as TooltipTrigger,
  Arrow as TooltipArrow
};
