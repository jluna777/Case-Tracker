using System.ComponentModel.DataAnnotations;

namespace CaseTracker.Api.Models;

public class CaseNote
{
    public int Id { get; set; }
    public int CaseId { get; set; }
    public NoteKind Kind { get; set; }

    // Null for System notes.
    public string? Author { get; set; }

    [MaxLength(2000)]
    public string Body { get; set; } = "";

    public DateTime CreatedAt { get; set; }
}
