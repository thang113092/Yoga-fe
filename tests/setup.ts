import '@angular/compiler';
import { registerLocaleData } from '@angular/common';
import localeVi from '@angular/common/locales/vi';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { afterEach } from 'vitest';

registerLocaleData(localeVi);
TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
afterEach(() => { TestBed.resetTestingModule(); localStorage.clear(); });
