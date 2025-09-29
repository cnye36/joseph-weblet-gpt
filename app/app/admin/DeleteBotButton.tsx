'use client';

interface DeleteBotButtonProps {
  botId: string;
  botName: string;
}

export default function DeleteBotButton({ botId, botName }: DeleteBotButtonProps) {
  const handleDelete = () => {
    if (
      confirm(
        `Are you sure you want to delete "${botName}"? This action cannot be undone.`
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
      className="text-xs text-red-600 hover:text-red-800 underline"
      onClick={handleDelete}
    >
      Delete
    </button>
  );
}
