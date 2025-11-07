## Lógica anterior de `SalonCarousel`

Esta es una referencia de la implementación que se retiró momentáneamente para priorizar el aspecto visual del carrusel.

### Flujo original

- El componente recibía `salons`, `selectedSalon` y `onSelectSalon`.
- Se agregaba una tarjeta virtual "`Ver todas`" al inicio (id `"all"`).
- Se calculaba el índice inicial a partir de `selectedSalon`.
- Cada vez que Embla (`Carousel`) cambiaba de slide se sincronizaba el índice activo y se invocaba `onSelectSalon`.
- El botón de cada card llamaba a `handleCardPress` para actualizar selección y mover el carrusel.

### Estilos y comportamiento

- Tarjetas visuales con imágenes, overlay y estados activos.
- `CarouselItem` usaba bases responsivas (`basis-[85%]`, `md:basis-1/2`, etc.).
- Controles personalizados (flechas y dots) se mostraban dentro del carrusel.
- Las tarjetas activas aplicaban `ring-2` y `shadow` para destacar.

### Motivo del cambio

Por ahora se requiere replicar el carrusel de la documentación oficial de shadcn (visual simple), así que se eliminó la capa de lógica y el componente quedó en modo meramente presentacional. Esta nota sirve para restaurar la funcionalidad cuando vuelva a ser necesaria.

