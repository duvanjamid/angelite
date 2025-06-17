/**
 * AngeLite - A lightweight framework with Angular's features that runs directly in the browser
 */

import { Component } from './decorators/component.js';
import { Directive } from './decorators/directive.js';
import { Injectable } from './decorators/injectable.js';
import { VNode, createElement } from './core/vdom.js';
import { render } from './core/renderer.js';
import { bootstrap } from './core/bootstrap.js';
import { NgIf, NgFor, NgModel } from './directives/built-in.js';
import {
  ChangeDetectionStrategy,
  markDirty,
  detectChanges,
  detectChangesInAll,
  detachChangeDetection,
  attachChangeDetection,
  runOutsideChangeDetection,
  ChangeDetection
} from './core/change-detection.js';
import {
  IfDirective,
  ElseDirective,
  ForDirective,
  SwitchDirective,
  CaseDirective,
  DefaultDirective,
  DeferDirective
} from './directives/modern-directives.js';
import {
  Input,
  Output,
  EventEmitter
} from './decorators/input-output.js';
import { Pipe } from './pipes/pipe.js';
import {
  UpperCasePipe,
  LowerCasePipe,
  DatePipe,
  CurrencyPipe,
  DecimalPipe,
  PercentPipe,
  JsonPipe,
  SlicePipe,
  AsyncPipe,
  TitleCasePipe
} from './pipes/built-in-pipes.js';
import {
  Route,
  Router,
  router,
  RouterOutlet,
  RouterLink,
  initializeRouter
} from './router/router.js';
import {
  RouterOutletComponent,
  RouterLinkComponent,
  RouterLinkActiveDirective,
  registerRouterComponents
} from './router/router-components.js';
import {
  RouteGuard,
  AuthGuard,
  RoleGuard,
  ConfirmGuard,
  FeatureFlagGuard,
  Guard
} from './router/guards.js';
import {
  Resolver,
  DataResolver,
  ListResolver,
  UserResolver,
  CombinedResolver,
  ResolverDef
} from './router/resolvers.js';
import {
  FormControl,
  FormGroup,
  FormArray,
  AbstractControl
} from './forms/form-control.js';
import {
  FormControlDirective,
  FormGroupDirective,
  FormArrayDirective,
  FormGroupNameDirective,
  FormArrayNameDirective,
  registerFormDirectives
} from './forms/form-directives.js';
import {
  FormBuilder,
  formBuilder
} from './forms/form-builder.js';
import * as Validators from './forms/validators.js';

// Registrar componentes del router
registerRouterComponents();

// Registrar directivas de formularios
registerFormDirectives();

// Export public API
export {
  Component,
  Directive,
  Injectable,
  VNode,
  createElement,
  render,
  bootstrap,
  NgIf,
  NgFor,
  NgModel,
  // Change detection exports
  ChangeDetectionStrategy,
  markDirty,
  detectChanges,
  detectChangesInAll,
  detachChangeDetection,
  attachChangeDetection,
  runOutsideChangeDetection,
  ChangeDetection,
  // Modern directives
  IfDirective,
  ElseDirective,
  ForDirective,
  SwitchDirective,
  CaseDirective,
  DefaultDirective,
  DeferDirective,
  // Component communication
  Input,
  Output,
  EventEmitter,
  // Pipes
  Pipe,
  UpperCasePipe,
  LowerCasePipe,
  DatePipe,
  CurrencyPipe,
  DecimalPipe,
  PercentPipe,
  JsonPipe,
  SlicePipe,
  AsyncPipe,
  TitleCasePipe,
  // Router
  Route,
  Router,
  router,
  RouterOutlet,
  RouterLink,
  initializeRouter,
  RouterOutletComponent,
  RouterLinkComponent,
  RouterLinkActiveDirective,
  // Guards
  RouteGuard,
  AuthGuard,
  RoleGuard,
  ConfirmGuard,
  FeatureFlagGuard,
  Guard,
  // Resolvers
  Resolver,
  DataResolver,
  ListResolver,
  UserResolver,
  CombinedResolver,
  ResolverDef,
  // Forms
  AbstractControl,
  FormControl,
  FormGroup,
  FormArray,
  FormBuilder,
  formBuilder,
  Validators,
  FormControlDirective,
  FormGroupDirective,
  FormArrayDirective,
  FormGroupNameDirective,
  FormArrayNameDirective
};

// Global namespace for browser usage without modules
window.AngeLite = {
  Component,
  Directive,
  Injectable,
  VNode,
  createElement,
  render,
  bootstrap,
  NgIf,
  NgFor,
  NgModel,
  // Change detection exports
  ChangeDetectionStrategy,
  markDirty,
  detectChanges,
  detectChangesInAll,
  detachChangeDetection,
  attachChangeDetection,
  runOutsideChangeDetection,
  ChangeDetection,
  // Modern directives
  IfDirective,
  ElseDirective,
  ForDirective,
  SwitchDirective,
  CaseDirective,
  DefaultDirective,
  DeferDirective,
  // Component communication
  Input,
  Output,
  EventEmitter,
  // Pipes
  Pipe,
  UpperCasePipe,
  LowerCasePipe,
  DatePipe,
  CurrencyPipe,
  DecimalPipe,
  PercentPipe,
  JsonPipe,
  SlicePipe,
  AsyncPipe,
  TitleCasePipe,
  // Router
  Route,
  Router,
  router,
  RouterOutlet,
  RouterLink,
  initializeRouter,
  RouterOutletComponent,
  RouterLinkComponent,
  RouterLinkActiveDirective,
  // Guards
  RouteGuard,
  AuthGuard,
  RoleGuard,
  ConfirmGuard,
  FeatureFlagGuard,
  Guard,
  // Resolvers
  Resolver,
  DataResolver,
  ListResolver,
  UserResolver,
  CombinedResolver,
  ResolverDef,
  // Forms
  AbstractControl,
  FormControl,
  FormGroup,
  FormArray,
  FormBuilder,
  formBuilder,
  Validators,
  FormControlDirective,
  FormGroupDirective,
  FormArrayDirective,
  FormGroupNameDirective,
  FormArrayNameDirective
};
