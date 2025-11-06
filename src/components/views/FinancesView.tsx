import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { PageContainer } from "../layout/PageContainer";
import { Section } from "../layout/Section";
import { SalonCarousel } from "../SalonCarousel";
import type { Salon } from "../../types/salon";
import { useAuth } from "../../contexts/AuthContext";
import { useFinancialPermissions } from "../../hooks/useFinancialPermissions";
import { DateRangeFilter, type DateRange } from "../features/finances/DateRangeFilter";
import OwnerDashboard from "./OwnerDashboard";
import SalesMarketingDashboard from "./SalesMarketingDashboard";
import OperationsDashboard from "./OperationsDashboard";
import AccountingDashboard from "./AccountingDashboard";
import ClientDashboard from "./ClientDashboard";

interface FinancesViewProps {
  selectedSalon: string | null;
  salonName?: string;
  salons?: Salon[];
  onSelectSalon?: (salonId: string, salonName: string) => void;
}

export default function FinancesView({ selectedSalon, salonName, salons = [], onSelectSalon }: FinancesViewProps) {
  const { isDemo } = useAuth();
  const { canViewFinances } = useFinancialPermissions();
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  
  // Validar permisos
  if (!isDemo && !canViewFinances) {
    return (
      <PageContainer>
        <Section title="Acceso Denegado" description={salonName}>
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg mb-2">No tienes permiso para ver esta sección</h3>
              <p className="text-muted-foreground mb-4">Solo los dueños pueden acceder a finanzas</p>
            </CardContent>
          </Card>
        </Section>
      </PageContainer>
    );
  }
  

  return (
    <PageContainer>
      {salons.length > 0 && (
        <section className="mb-4 p-4 sm:p-6" role="region" aria-label="Selector de salón para finanzas">
          <h2 className="mb-4 text-xl md:text-2xl font-semibold">Ver tus finanzas</h2>
          <div>
            <SalonCarousel 
              salons={salons}
              selectedSalon={selectedSalon}
              onSelectSalon={onSelectSalon || (() => {})}
            />
          </div>
        </section>
      )}
      
      {/* Filtro de Fechas */}
      <section className="mb-4" role="region" aria-label="Filtro de rango de fechas">
        <DateRangeFilter 
          value={dateRange || undefined}
          onChange={setDateRange}
        />
      </section>

      <section className="mt-4" role="region" aria-label="Panel de finanzas">
        <Section 
          title="Finanzas"
          description={salonName}
        >
          <Tabs defaultValue="owner" className="space-y-4" role="tablist" aria-label="Paneles de finanzas">
            <TabsList>
              <TabsTrigger value="owner" aria-label="Vista de propietario">Propietario</TabsTrigger>
              <TabsTrigger value="sales" aria-label="Vista de ventas y marketing">Ventas y Marketing</TabsTrigger>
              <TabsTrigger value="operations" aria-label="Vista de operaciones">Operaciones</TabsTrigger>
              <TabsTrigger value="accounting" aria-label="Vista de finanzas y contabilidad">Finanzas/Contabilidad</TabsTrigger>
              <TabsTrigger value="clients" aria-label="Vista de CRM y clientes">CRM/Clientes</TabsTrigger>
            </TabsList>
          
            <TabsContent value="owner" role="tabpanel" aria-label="Dashboard de propietario">
              <OwnerDashboard 
                selectedSalon={selectedSalon}
                salonName={salonName}
                dateRange={dateRange || undefined}
              />
            </TabsContent>
            
            <TabsContent value="sales" role="tabpanel" aria-label="Dashboard de ventas y marketing">
              <SalesMarketingDashboard 
                selectedSalon={selectedSalon}
                dateRange={dateRange || undefined}
              />
            </TabsContent>
            
            <TabsContent value="operations" role="tabpanel" aria-label="Dashboard de operaciones">
              <OperationsDashboard 
                selectedSalon={selectedSalon}
                dateRange={dateRange || undefined}
              />
            </TabsContent>
            
            <TabsContent value="accounting" role="tabpanel" aria-label="Dashboard de finanzas y contabilidad">
              <AccountingDashboard 
                selectedSalon={selectedSalon}
                dateRange={dateRange || undefined}
              />
            </TabsContent>
            
            <TabsContent value="clients" role="tabpanel" aria-label="Dashboard de CRM y clientes">
              <ClientDashboard 
                selectedSalon={selectedSalon}
                dateRange={dateRange || undefined}
              />
            </TabsContent>
          </Tabs>
        </Section>
      </section>
    </PageContainer>
  );
}