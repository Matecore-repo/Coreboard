-- Agregar campo image a la tabla salons
alter table app.salons 
add column if not exists image text;

-- Comentario
comment on column app.salons.image is 'URL de la imagen del local almacenada en Supabase Storage';
