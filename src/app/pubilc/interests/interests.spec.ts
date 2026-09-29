import { TestBed } from '@angular/core/testing';
import { Interests } from './interests';

describe('Interests', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({ imports: [Interests] }).compileComponents();
    const fixture = TestBed.createComponent(Interests);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
