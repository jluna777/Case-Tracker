namespace CaseTracker.Api.Models;

public enum CaseStatus { New, InProgress, WaitingOnCustomer, Resolved, Closed }

public enum Priority { High, Medium, Low }

public enum Category { D365Sales, CustomerService, PowerAutomate, Integration }

public enum NoteKind { Agent, System }

public static class EnumLabels
{
    public static string Label(this CaseStatus status) => status switch
    {
        CaseStatus.InProgress => "In Progress",
        CaseStatus.WaitingOnCustomer => "Waiting on Customer",
        _ => status.ToString(),
    };
}
