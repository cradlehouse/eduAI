// The Imaje wordmark (from output/brand/imaje-wordmark-dark.svg). Letters take the text colour; the two
// dots are the brand mark: an amber ring over the i, a light ring with an amber centre over the j.
// The rings are cut out (even-odd), so the page shows through on any background.
export function Logo({ className = "h-5 w-auto", title = "Imaje" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="-8 2 669 290" className={className} role="img" aria-label={title} fill="currentColor">
      <path fillRule="evenodd" d="M0 87 57 80V220H0ZM68 84H116V96C134 77 163 76 184 95C209 73 258 78 258 120V220H207V127C207 111 190 111 190 127V220H140V127C140 111 123 111 123 127V220H68ZM340 80C296 80 266 109 266 151C266 195 296 224 335 224C352 224 366 218 375 210V220H421V151C421 109 389 80 340 80ZM343 122A29 29 0 1 1 343 180A29 29 0 1 1 343 122ZM435 87 492 80V211C492 263 458 290 400 290H379V242H402C425 242 435 230 435 208ZM659 165H554C558 189 588 195 606 176L652 196C635 220 608 227 580 225C533 223 505 194 505 151C505 110 535 80 581 80C633 80 662 112 659 165ZM555 136H607C603 114 561 113 555 136Z" />
      <path fill="var(--color-brand)" fillRule="evenodd" d="M63.5 39A35 35 0 1 1-6.5 39A35 35 0 1 1 63.5 39ZM44.5 39A16 16 0 1 0 12.5 39A16 16 0 1 0 44.5 39Z" />
      <path fillRule="evenodd" d="M498.5 39A35 35 0 1 1 428.5 39A35 35 0 1 1 498.5 39ZM479.5 39A16 16 0 1 0 447.5 39A16 16 0 1 0 479.5 39Z" />
      <circle cx="463.5" cy="39" r="16" fill="var(--color-brand)" />
    </svg>
  );
}
