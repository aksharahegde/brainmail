import { getWorkspaceEmailCategories } from '../workspaces/context';
import type { AutomationCondition, AutomationDefinition } from './types';

type EmailContext = {
  id: string;
  subject: string | null;
  sender: string | null;
  category: string | null;
};

function asString(value: string | null | undefined): string {
  return (value ?? '').toLowerCase();
}

function matchesCondition(
  condition: AutomationCondition,
  email: EmailContext,
): boolean {
  const value = condition.value.toLowerCase();

  if (condition.type === 'category') {
    const category = asString(email.category);
    return condition.operator === 'equals'
      ? category === value
      : category.includes(value);
  }

  if (condition.type === 'sender_contains') {
    const sender = asString(email.sender);
    return condition.operator === 'equals'
      ? sender === value
      : sender.includes(value);
  }

  if (condition.type === 'subject_contains') {
    const subject = asString(email.subject);
    return condition.operator === 'equals'
      ? subject === value
      : subject.includes(value);
  }

  if (condition.type === 'workspace') {
    const categories = getWorkspaceEmailCategories(value);
    if (categories.length === 0) {
      return true;
    }

    return email.category
      ? (categories as readonly string[]).includes(email.category)
      : false;
  }

  return false;
}

export function evaluateAutomationConditions(
  definition: AutomationDefinition,
  email: EmailContext,
): boolean {
  if (definition.conditions.length === 0) {
    return true;
  }

  return definition.conditions.every((condition) =>
    matchesCondition(condition, email),
  );
}

export function shouldRunOnNewEmail(definition: AutomationDefinition): boolean {
  return definition.trigger.type === 'new_email';
}

export function shouldRunOnSchedule(
  definition: AutomationDefinition,
  schedule: 'daily' | 'weekly',
): boolean {
  return (
    definition.trigger.type === 'schedule' &&
    definition.trigger.schedule === schedule
  );
}
