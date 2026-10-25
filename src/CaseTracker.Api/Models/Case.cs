using System.ComponentModel.DataAnnotations;

namespace CaseTracker.Api.Models;

public class Case
{
    public int Id { get; set; }

    [MaxLength(120)]
    public string Title { get; set; } = "";

    public string Customer { get; set; } = "";
    public Category Category { get; set; }
    public Priority Priority { get; set; }
    public CaseStatus Status { get; set; }
    public string? Assignee { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    public string CreatedBy { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime DueAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public List<CaseNote> Notes { get; set; } = [];
}
