function loadCotizacionSupabase(id) {
    ...
    if (data.data) this.datos = data.data;

    // Preservar estado cargado o previo; fallback a 'borrador' solo si no hay ninguno
    const estadoDB = data?.estado;
    const estadoPrev = this.datos?.estado;
    if (estadoDB) {
      this.datos.estado = estadoDB;
    } else if (estadoPrev) {
      this.datos.estado = estadoPrev;
    } else {
      this.datos.estado = 'borrador';
    }
    ...
}

function _buildRowFromDatos() {
    const estadoBase = this.datos.estado || 'borrador';
    return {
        ...
        estado: estadoBase,
        ...
    };
}