'use client';

interface DeleteBotButtonProps {
  botId: string;
}

export default function DeleteBotButton({ botId }: DeleteBotButtonProps) {
  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this bot? This action cannot be undone."
      )
    ) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `/app/admin/bots/${botId}/delete`;
      document.body.appendChild(form);
      form.submit();
    }
  };

  return (
    <button
      type="button"
      className="px-3 py-2 rounded border bg-red-50 text-red-700 hover:bg-red-100"
      onClick={handleDelete}
    >
      Delete Bot
    </button>
  );
}
