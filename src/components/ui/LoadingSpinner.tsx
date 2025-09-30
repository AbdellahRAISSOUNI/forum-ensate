export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b2b5c]"></div>
      <p className="mt-4 text-[#0b2b5c]">Chargement...</p>
    </div>
  );
}

