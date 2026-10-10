# Profile avatar artwork

Add up to 24 square PNGs here, named `avatar-01.png` through `avatar-24.png`.
512 × 512 pixels works well; transparency is supported. Images are cropped into
a circle in profile cards and the header.

Slots already exist in `shared/profile-avatars.json`. Replace their labels there
with meaningful names as you add artwork. Restart the development server after
adding files; production builds automatically enable only PNGs that exist.
Missing slots stay disabled and never request a missing image. Country flags
remain selectable. Previously saved emoji avatars remain supported but are no
longer offered in the picker.
