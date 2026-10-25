using CaseTracker.Api.Models;

namespace CaseTracker.Tests;

public class CaseStatusRulesTests
{
    [Theory]
    [InlineData(CaseStatus.New, CaseStatus.InProgress)]
    [InlineData(CaseStatus.InProgress, CaseStatus.WaitingOnCustomer)]
    [InlineData(CaseStatus.InProgress, CaseStatus.Resolved)]
    [InlineData(CaseStatus.WaitingOnCustomer, CaseStatus.InProgress)]
    [InlineData(CaseStatus.WaitingOnCustomer, CaseStatus.Resolved)]
    [InlineData(CaseStatus.Resolved, CaseStatus.Closed)]
    public void Allowed_move_has_no_error(CaseStatus from, CaseStatus to)
    {
        Assert.True(CaseStatusRules.CanMove(from, to));
        Assert.Null(CaseStatusRules.GetMoveError(from, to));
    }

    [Theory]
    [InlineData(CaseStatus.Closed, CaseStatus.InProgress, "Closed cases must be reopened before work can continue.")]
    [InlineData(CaseStatus.Resolved, CaseStatus.InProgress, "Resolved cases must be reopened before work can continue.")]
    [InlineData(CaseStatus.InProgress, CaseStatus.Closed, "Resolve the case before closing it.")]
    [InlineData(CaseStatus.New, CaseStatus.Resolved, "Can't move a case from New to Resolved.")]
    [InlineData(CaseStatus.InProgress, CaseStatus.InProgress, "Case is already In Progress.")]
    public void Disallowed_move_returns_exact_message(CaseStatus from, CaseStatus to, string expected)
    {
        Assert.False(CaseStatusRules.CanMove(from, to));
        Assert.Equal(expected, CaseStatusRules.GetMoveError(from, to));
    }

    [Theory]
    [InlineData(CaseStatus.New, new[] { CaseStatus.InProgress })]
    [InlineData(CaseStatus.InProgress, new[] { CaseStatus.WaitingOnCustomer, CaseStatus.Resolved })]
    [InlineData(CaseStatus.WaitingOnCustomer, new[] { CaseStatus.InProgress, CaseStatus.Resolved })]
    [InlineData(CaseStatus.Resolved, new[] { CaseStatus.Closed })]
    public void GetNextStatuses_matches_transition_table(CaseStatus from, CaseStatus[] expected)
    {
        Assert.Equal(expected, CaseStatusRules.GetNextStatuses(from));
    }

    [Fact]
    public void GetNextStatuses_for_Closed_is_empty()
    {
        Assert.Empty(CaseStatusRules.GetNextStatuses(CaseStatus.Closed));
    }

    [Theory]
    [InlineData(CaseStatus.New, false)]
    [InlineData(CaseStatus.InProgress, false)]
    [InlineData(CaseStatus.WaitingOnCustomer, false)]
    [InlineData(CaseStatus.Resolved, true)]
    [InlineData(CaseStatus.Closed, true)]
    public void CanReopen_only_for_Resolved_and_Closed(CaseStatus from, bool expected)
    {
        Assert.Equal(expected, CaseStatusRules.CanReopen(from));
    }
}
