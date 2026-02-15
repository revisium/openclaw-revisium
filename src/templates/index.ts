import agentMemory from './agent-memory.json';
import contacts from './contacts.json';
import expenses from './expenses.json';

export interface TableSchema {
  type: 'object';
  properties: Record<string, Record<string, unknown>>;
  additionalProperties: false;
  required: string[];
}

export interface Template {
  name: string;
  description: string;
  version: string;
  tables: Record<string, TableSchema>;
}

export const agentMemoryTemplate: Template = agentMemory as Template;
export const contactsTemplate: Template = contacts as Template;
export const expensesTemplate: Template = expenses as Template;

export const templates: Record<string, Template> = {
  'agent-memory': agentMemoryTemplate,
  contacts: contactsTemplate,
  expenses: expensesTemplate,
};

export const templateNames = Object.keys(templates);

export function getTemplate(name: string): Template | undefined {
  return templates[name];
}
