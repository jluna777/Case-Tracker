using CaseTracker.Api.Models;

namespace CaseTracker.Tests;

public class DueDateTests
{
    private static readonly DateTime Created = new(2026, 10, 22, 14, 30, 0, DateTimeKind.Utc);
    private static readonly DateTime Due = Created.AddHours(24);

    [Theory]
    [InlineData(Priority.High, 24)]
    [InlineData(Priority.Medium, 72)]
    [InlineData(Priority.Low, 120)]
    public void CalculateDue_adds_hours_for_priority(Priority priority, int hours)
    {
        Assert.Equal(Created.AddHours(hours), CaseStatusRules.CalculateDue(priority, Created));
    }

    [Fact]
    public void IsOverdue_when_open_and_past_due()
    {
        Assert.True(CaseStatusRules.IsOverdue(CaseStatus.InProgress, Due, Due.AddMinutes(1)));
    }

    [Fact]
    public void IsOverdue_false_when_exactly_at_due()
    {
        Assert.False(CaseStatusRules.IsOverdue(CaseStatus.InProgress, Due, Due));
    }

    [Theory]
    [InlineData(CaseStatus.Resolved)]
    [InlineData(CaseStatus.Closed)]
    public void IsOverdue_false_for_Resolved_and_Closed_even_when_past_due(CaseStatus status)
    {
        Assert.False(CaseStatusRules.IsOverdue(status, Due, Due.AddDays(3)));
    }

    [Fact]
    public void IsOverdue_when_Waiting_on_Customer_and_past_due()
    {
        Assert.True(CaseStatusRules.IsOverdue(CaseStatus.WaitingOnCustomer, Due, Due.AddMinutes(1)));
    }
}
