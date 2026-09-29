import { TestBed } from '@angular/core/testing';
import { PageNotFound } from './page-not-found';

describe('PageNotFound', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({ imports: [PageNotFound] }).compileComponents();
    const fixture = TestBed.createComponent(PageNotFound);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
