import { randomUUID } from "node:crypto";

import { pool } from "../config/db.js";
import { supabaseAdmin } from "../config/supabaseAdmin.js";

const BUCKET_FOTOS_PERFIL = "fotos-perfil";
const TAMANO_MAXIMO = 2 * 1024 * 1024;

const formatos = {
  "image/jpeg": {
    extension: "jpg",
    coincide: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  "image/png": {
    extension: "png",
    coincide: (buffer) =>
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
  },
  "image/webp": {
    extension: "webp",
    coincide: (buffer) =>
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP",
  },
};

function errorConEstado(mensaje, status) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

function explicarErrorMigracion(error) {
  if (error.code === "42703") {
    return errorConEstado(
      "La base de datos aún no tiene habilitadas las fotos de perfil. Ejecuta database/11_fotos_perfil.sql.",
      409,
    );
  }

  return error;
}

function obtenerRutaFoto(urlPublica) {
  if (!urlPublica) return null;

  try {
    const url = new URL(urlPublica);
    const prefijo = `/storage/v1/object/public/${BUCKET_FOTOS_PERFIL}/`;

    if (!url.pathname.startsWith(prefijo)) return null;
    return decodeURIComponent(url.pathname.slice(prefijo.length));
  } catch {
    return null;
  }
}

export async function actualizarDatosPerfil(usuarioId, datos) {
  const { rows } = await pool.query(
    `UPDATE public.usuarios
     SET
       tipo_documento = $1,
       numero_documento = $2,
       nombre = $3,
       apellido = $4
     WHERE id = $5
     RETURNING
       nombre,
       apellido,
       email,
       tipo_documento AS "tipoDocumento",
       numero_documento AS "numeroDocumento"`,
    [
      datos.tipo_documento,
      datos.numero_documento.trim().toUpperCase(),
      datos.nombre.trim(),
      datos.apellido.trim(),
      usuarioId,
    ],
  );

  if (!rows[0]) {
    throw errorConEstado("Usuario no encontrado", 404);
  }

  return rows[0];
}

export async function actualizarFotoPerfil(usuarioId, imagen, contentType) {
  if (imagen.length > TAMANO_MAXIMO) {
    throw errorConEstado("La imagen debe pesar máximo 2 MB", 413);
  }

  const formato = formatos[contentType];

  if (!formato || !formato.coincide(imagen)) {
    throw errorConEstado("Usa una imagen JPG, PNG o WEBP válida", 400);
  }

  let perfilAnterior;
  try {
    const { rows } = await pool.query(
      `SELECT foto_perfil_url
       FROM public.usuarios
       WHERE id = $1
       LIMIT 1`,
      [usuarioId],
    );
    perfilAnterior = rows;
  } catch (error) {
    throw explicarErrorMigracion(error);
  }

  if (!perfilAnterior[0]) {
    throw errorConEstado("Usuario no encontrado", 404);
  }

  const ruta = `usuarios/${usuarioId}/${randomUUID()}.${formato.extension}`;
  const almacenamiento = supabaseAdmin.storage.from(BUCKET_FOTOS_PERFIL);
  const { error: errorCarga } = await almacenamiento.upload(ruta, imagen, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });

  if (errorCarga) {
    if (errorCarga.message?.toLowerCase().includes("bucket not found")) {
      throw errorConEstado(
        "Falta configurar el almacenamiento de fotos. Ejecuta la migración 11_fotos_perfil.sql.",
        409,
      );
    }

    throw new Error("No se pudo guardar la foto de perfil");
  }

  const { data: urlFoto } = almacenamiento.getPublicUrl(ruta);
  const fotoPerfilUrl = urlFoto?.publicUrl;

  if (!fotoPerfilUrl) {
    await almacenamiento.remove([ruta]);
    throw new Error("No se pudo obtener la URL de la foto de perfil");
  }

  let usuarioActualizado;
  try {
    const { rows } = await pool.query(
      `UPDATE public.usuarios
       SET foto_perfil_url = $1
       WHERE id = $2
       RETURNING foto_perfil_url AS "fotoPerfilUrl"`,
      [fotoPerfilUrl, usuarioId],
    );

    if (!rows[0]) {
      throw errorConEstado("Usuario no encontrado", 404);
    }

    usuarioActualizado = rows[0];
  } catch (error) {
    await almacenamiento.remove([ruta]);
    throw explicarErrorMigracion(error);
  }

  const rutaAnterior = obtenerRutaFoto(perfilAnterior[0].foto_perfil_url);
  if (rutaAnterior && rutaAnterior !== ruta) {
    try {
      const { error: errorEliminacion } = await almacenamiento.remove([rutaAnterior]);
      if (errorEliminacion) throw errorEliminacion;
    } catch {
      console.error("No se pudo eliminar la foto de perfil anterior");
    }
  }

  return usuarioActualizado;
}

export async function eliminarFotoPerfil(usuarioId) {
  let perfilActual;
  try {
    const { rows } = await pool.query(
      `SELECT foto_perfil_url
       FROM public.usuarios
       WHERE id = $1
       LIMIT 1`,
      [usuarioId],
    );
    perfilActual = rows[0];
  } catch (error) {
    throw explicarErrorMigracion(error);
  }

  if (!perfilActual) {
    throw errorConEstado("Usuario no encontrado", 404);
  }

  let usuarioActualizado;
  try {
    const { rows } = await pool.query(
      `UPDATE public.usuarios
       SET foto_perfil_url = NULL
       WHERE id = $1
       RETURNING foto_perfil_url AS "fotoPerfilUrl"`,
      [usuarioId],
    );
    usuarioActualizado = rows[0];
  } catch (error) {
    throw explicarErrorMigracion(error);
  }

  const rutaFoto = obtenerRutaFoto(perfilActual.foto_perfil_url);
  if (rutaFoto) {
    try {
      const { error } = await supabaseAdmin.storage
        .from(BUCKET_FOTOS_PERFIL)
        .remove([rutaFoto]);
      if (error) throw error;
    } catch {
      console.error("No se pudo eliminar el archivo de foto de perfil");
    }
  }

  return usuarioActualizado ?? { fotoPerfilUrl: null };
}
