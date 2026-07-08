/**
 * Generic OpenAPI provider.
 *
 * Uses the BaseProvider defaults for parsing and operation->tool mapping — no
 * vendor-specific naming or resource categorization. This is the right choice
 * for arbitrary specs (e.g. a curated FHIR subset); tool names come straight
 * from operationIds.
 */
import * as path from 'path';
import { BaseProvider } from '../../core/models/base-provider';

export class GenericProvider extends BaseProvider {
  readonly name = 'generic';
  readonly version = '1.0.0';
  readonly description = 'Generic OpenAPI provider (no vendor-specific behaviour)';

  protected get templatesDir(): string {
    // Retained by the abstract base; the server is generated from core
    // templates, so no provider templates are read.
    return path.join(__dirname, 'templates');
  }
}
