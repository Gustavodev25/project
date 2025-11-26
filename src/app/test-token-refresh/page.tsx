"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function TestTokenRefreshPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const { toast } = useToast();

  const testManualRefresh = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const platform = (document.getElementById("platform") as HTMLSelectElement)?.value;
      const accountId = (document.getElementById("accountId") as HTMLInputElement)?.value;

      if (!platform || !accountId) {
        toast({
          variant: "error",
          title: "Erro",
          description: "Por favor, preencha todos os campos",
        });
        return;
      }

      const response = await fetch("/api/test/token-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, accountId }),
      });

      const result = await response.json();
      setTestResult(result);

      if (result.success) {
        toast({
          variant: "success",
          title: "Sucesso",
          description: "Token renovado com sucesso!",
        });
      } else {
        toast({
          variant: "error",
          title: "Erro",
          description: result.error || "Erro ao renovar token",
        });
      }
    } catch (error) {
      console.error("Erro:", error);
      toast({
        variant: "error",
        title: "Erro",
        description: "Erro de conexão",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAutoRefresh = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/test/auto-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      setTestResult(result);

      if (result.success) {
        toast({
          variant: "success",
          title: "Sucesso",
          description: "Sistema de renovação automática testado com sucesso!",
        });
      } else {
        toast({
          variant: "error",
          title: "Erro",
          description: result.error || "Erro ao testar renovação automática",
        });
      }
    } catch (error) {
      console.error("Erro:", error);
      toast({
        variant: "error",
        title: "Erro",
        description: "Erro de conexão",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Teste de Renovação de Tokens</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Teste Manual */}
        <Card>
          <CardHeader>
            <CardTitle>Teste Manual de Renovação</CardTitle>
            <CardDescription>
              Teste a renovação manual de um token específico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="platform">Plataforma</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meli">Mercado Livre</SelectItem>
                  <SelectItem value="shopee">Shopee</SelectItem>
                  <SelectItem value="bling">Bling</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="accountId">ID da Conta</Label>
              <Input
                id="accountId"
                placeholder="Cole aqui o ID da conta"
                type="text"
              />
            </div>
            
            <Button 
              onClick={testManualRefresh} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Testando..." : "Testar Renovação Manual"}
            </Button>
          </CardContent>
        </Card>

        {/* Teste Automático */}
        <Card>
          <CardHeader>
            <CardTitle>Teste de Renovação Automática</CardTitle>
            <CardDescription>
              Teste o sistema de cron job que renova tokens automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Este teste executa o mesmo processo que roda automaticamente a cada 30 minutos.
            </p>
            
            <Button 
              onClick={testAutoRefresh} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Testando..." : "Testar Renovação Automática"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resultado */}
      {testResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Resultado do Teste</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Informações do Sistema */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Informações do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Renovação Automática:</strong> A cada 30 minutos</p>
          <p><strong>Renovação Preventiva:</strong> 2 horas antes da expiração</p>
          <p><strong>Retry:</strong> Até 3 tentativas com backoff exponencial</p>
          <p><strong>Notificações:</strong> Enviadas automaticamente quando tokens são renovados</p>
        </CardContent>
      </Card>
    </div>
  );
}
