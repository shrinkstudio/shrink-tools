import Header from "@/components/Header";
import LoadingState from "@/components/LoadingState";
import Footer from "@/components/Footer";

export default function PreviewLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <LoadingState />
      </main>
      <Footer />
    </div>
  );
}
