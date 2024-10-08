# Create SQL Managed Instance for failover
module "sqlmanagedinstance_failover_$loopvar" {
  source                       = "github.com/ARCH-AMIS/tf_mod_az_sql_managed_instance//mssql_managed_instance?ref=tag"
  administrator_login          = "sqlmiadmin"
  location                     = var.failover_location$loopvar  # Failover location
  name                         = var.failover_name$loopvar      # Failover name
  resource_group_name          = var.failover_resource_group_name$loopvar
  sku_name                     = var.sku_name$loopvar
  storage_size_in_gb           = var.storage_size_in_gb$loopvar
  vcores                       = var.vcores$loopvar
  subnet_id                    = data.azurerm_subnet.primary_subnet_failover$loopvar.id
  key_vault_id                 = data.azurerm_key_vault.key_vault$loopvar.id
  license_type                 = "LicenseIncluded"
  minimum_tls_version          = "1.2"
  proxy_override               = "Default"
  public_data_endpoint_enabled = "false"
  zone_redundant_enabled       = var.zone_redundant_enabled$loopvar
  storage_account_type         = var.storage_account_type$loopvar
  timezone_id                  = var.timezone_id$loopvar
  collation                    = var.collation$loopvar

  identity = {
    type = "SystemAssigned"
  }

  tags = merge(var.tags$loopvar, {
    Application = "Azure SQL Managed Instance - Failover"
  })

  depends_on = [
    $rgDependency
  ]
}


# Create Failover Group for SQL Managed Instances
module "sqlmi_failover_group_$loopvar" {
  source                = "github.com/ARCH-AMIS/tf_mod_az_sql_managed_instance//mssql_failover_group?ref=tag"
  name                  = "${var.name$loopvar}-failover-group"   # Failover group name
  resource_group_name   = var.resource_group_name$loopvar        # Primary instance resource group
  managed_instance_ids  = [
    module.sqlmanagedinstance_$loopvar.mssql_managed_instance.id,           # Primary instance ID
    module.sqlmanagedinstance_failover_$loopvar.mssql_managed_instance.id   # Failover instance ID
  ]
  partner_servers       = [{
    id   = module.sqlmanagedinstance_failover_$loopvar.mssql_managed_instance.id,
    location = var.failover_location$loopvar
  }]

  read_write_endpoint_failover_policy = {
    mode           = "Automatic"
    grace_minutes  = 60   # Grace period before failover occurs
  }

  depends_on = [
    module.sqlmanagedinstance_$loopvar,
    module.sqlmanagedinstance_failover_$loopvar
  ]
}

