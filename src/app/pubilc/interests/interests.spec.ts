import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Interests } from './interests';

describe('Interests', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [Interests],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(Interests);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
