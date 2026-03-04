use anchor_lang::prelude::*;

declare_id!("8EYr1NdtTtZ9jB4vmgew2XEp4z2XVXcvJm6nez8tiZn1");

#[program]
pub mod inventario {
    use super::*;

    pub fn crear_producto(
        ctx: Context<CrearProducto>,
        nombre: String,
        cantidad: u64,
        precio: u64,
    ) -> Result<()> {
        require!(!nombre.is_empty(), ErroresInventario::NombreVacio);
        require!(nombre.len() <= 50, ErroresInventario::NombreMuyLargo);
        require!(cantidad > 0, ErroresInventario::CantidadInvalida);

        let producto = &mut ctx.accounts.producto;
        producto.nombre = nombre;
        producto.cantidad = cantidad;
        producto.precio = precio;
        producto.activo = true;
        producto.propietario = *ctx.accounts.usuario.key;
        Ok(())
    }

    pub fn actualizar_stock(
        ctx: Context<ModificarProducto>,
        nueva_cantidad: u64,
        nuevo_precio: u64,
    ) -> Result<()> {
        let producto = &mut ctx.accounts.producto;
        require!(producto.activo, ErroresInventario::ProductoInactivo);
        producto.cantidad = nueva_cantidad;
        producto.precio = nuevo_precio;
        Ok(())
    }

    pub fn toggle_activo(ctx: Context<ModificarProducto>) -> Result<()> {
        let producto = &mut ctx.accounts.producto;
        producto.activo = !producto.activo;
        Ok(())
    }

    pub fn eliminar_producto(_ctx: Context<EliminarProducto>) -> Result<()> {
        Ok(())
    }
}

#[error_code]
pub enum ErroresInventario {
    #[msg("El nombre del producto no puede estar vacío.")]
    NombreVacio,
    #[msg("El nombre del producto excede los 50 caracteres.")]
    NombreMuyLargo,
    #[msg("La cantidad no puede ser cero.")]
    CantidadInvalida,
    #[msg("No se puede modificar un producto inactivo.")]
    ProductoInactivo,
}

#[account]
#[derive(InitSpace)]
pub struct Producto {
    #[max_len(50)]
    pub nombre: String,
    pub cantidad: u64,
    pub precio: u64,
    pub activo: bool,
    pub propietario: Pubkey,
}

#[derive(Accounts)]
pub struct CrearProducto<'info> {
    #[account(
        init,
        payer = usuario,
        space = Producto::INIT_SPACE + 8
    )]
    pub producto: Account<'info, Producto>,
    #[account(mut)]
    pub usuario: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ModificarProducto<'info> {
    #[account(mut, has_one = propietario)]
    pub producto: Account<'info, Producto>,
    pub propietario: Signer<'info>,
}

#[derive(Accounts)]
pub struct EliminarProducto<'info> {
    #[account(
        mut,
        has_one = propietario,
        close = propietario
    )]
    pub producto: Account<'info, Producto>,
    #[account(mut)]
    pub propietario: Signer<'info>,
}