import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          </p>

          <Link href="/">
            <Button className="mt-6 w-full gap-2" data-testid="button-go-home">
              <Home className="w-4 h-4" />
              홈으로 돌아가기
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
