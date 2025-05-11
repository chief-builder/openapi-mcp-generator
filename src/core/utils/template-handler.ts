/**
 * Template handler utility for consistent template handling across providers
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { TemplateLoader } from './template-loader';

/**
 * Interface for template rendering options
 */
export interface ITemplateRenderOptions {
  /**
   * Variables to use for rendering the template
   */
  variables?: Record<string, any>;
  
  /**
   * Custom placeholders to use in the template
   * Default is ${variable}
   */
  placeholderPattern?: RegExp;
}

/**
 * Template handler utility for consistent template handling across providers
 */
export class TemplateHandler {
  /**
   * Load a template from the specified path
   * 
   * @param templatePath Path to the template
   * @returns Template content
   */
  public static loadTemplate(templatePath: string): string {
    return fs.readFileSync(templatePath, 'utf8');
  }
  
  /**
   * Render a template with the specified variables
   * 
   * @param template Template content
   * @param options Rendering options
   * @returns Rendered template
   */
  public static renderTemplate(template: string, options: ITemplateRenderOptions = {}): string {
    const { variables = {}, placeholderPattern = /\${(\w+)}/g } = options;
    
    return template.replace(placeholderPattern, (match, name) => {
      return variables[name] !== undefined ? String(variables[name]) : match;
    });
  }
  
  /**
   * Load and render a template from the specified path
   * 
   * @param templatePath Path to the template
   * @param options Rendering options
   * @returns Rendered template
   */
  public static loadAndRenderTemplate(templatePath: string, options: ITemplateRenderOptions = {}): string {
    const template = this.loadTemplate(templatePath);
    return this.renderTemplate(template, options);
  }
  
  /**
   * Get a template path relative to a base directory
   * 
   * @param baseDir Base directory 
   * @param templateName Template name or relative path
   * @returns Absolute path to the template
   */
  public static getTemplatePath(baseDir: string, templateName: string): string {
    return path.join(baseDir, templateName);
  }
  
  /**
   * Load a template from a provider's template directory
   * 
   * @param providerTemplatesDir Provider's templates directory
   * @param templateName Template name
   * @returns Template content
   */
  public static loadProviderTemplate(providerTemplatesDir: string, templateName: string): string {
    const templatePath = this.getTemplatePath(providerTemplatesDir, templateName);
    return this.loadTemplate(templatePath);
  }
  
  /**
   * Load and render a template from a provider's template directory
   * 
   * @param providerTemplatesDir Provider's templates directory
   * @param templateName Template name
   * @param options Rendering options
   * @returns Rendered template
   */
  public static loadAndRenderProviderTemplate(
    providerTemplatesDir: string, 
    templateName: string, 
    options: ITemplateRenderOptions = {}
  ): string {
    const templatePath = this.getTemplatePath(providerTemplatesDir, templateName);
    return this.loadAndRenderTemplate(templatePath, options);
  }
  
  /**
   * Combine multiple templates with the specified variables
   * 
   * @param templatePaths List of template paths
   * @param options Rendering options
   * @returns Combined rendered templates
   */
  public static combineTemplates(templatePaths: string[], options: ITemplateRenderOptions = {}): string {
    return templatePaths
      .map(templatePath => this.loadAndRenderTemplate(templatePath, options))
      .join('\n\n');
  }
}